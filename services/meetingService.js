
import fs from 'fs';
import path from 'path';
import config from 'nconf';
import async from 'async';
import moment from 'moment';
import download from 'download';
import uuidv4 from 'uuid/v4';
import logger from '../config/log';
import AppointmentModel from '../models/appointmentModel';
import ZoomAccountModel from '../models/zoomAccountModel';
import MeetingRecordModel from '../models/meetingRecordModel';
import ZoomLogsModel from '../models/zoomLogsModel';
import ServiceGroupModel from '../models/serviceGroupModel';
import {requestZoomCreateMeeting, requestListAllRecordings } from '../utils/httpUtil';

const target = config.get('EXECUTE_TARGET');
const {MP4_OUTPUT_FOLDER_PATH, LIST_RECORDING_PAGE_SIZE} = config.get(target);
const DEFAULT_MEETING_SYSTEM = "vidyo";
let queryDay;

export {
	checkMeetingSystem,
	createMeeting,
	listRecords,
	saveDailyMeetingRecords,
};

function checkMeetingSystem(bean, req, callback){
	let {input} = bean;
	//console.log('[checkMeetingSystem]input.accountdata: ',input.accountdata)
	if(!input || !input.accountdata || !input.accountdata.user || !input.accountdata.user.serviceGroupId || !input.accountdata.user.serviceGroupId.length) {
		console.log('[checkMeetingSystem]no serviceGroupId! result: ',DEFAULT_MEETING_SYSTEM)
		req.body.meetingSystem = DEFAULT_MEETING_SYSTEM;
		input.accountdata.user.meetingSystem = DEFAULT_MEETING_SYSTEM;
		return callback && callback(null);
	}
	let where = {
    '_id': input.accountdata.user.serviceGroupId[0]
	}
  ServiceGroupModel.findOne(where)
  .select('meetingSystem')
  .exec((err, result) => {
		if(err) return callback && callback(err);
		if(!result || !result.meetingSystem) {
			console.log('[checkMeetingSystem] No result: ',result)
			req.body.meetingSystem = DEFAULT_MEETING_SYSTEM;
			input.accountdata.user.meetingSystem = DEFAULT_MEETING_SYSTEM;
			return callback && callback(null);
		}
    console.log('[checkMeetingSystem]result: ',result)
		req.body.meetingSystem = result.meetingSystem;
		input.accountdata.user.meetingSystem = result.meetingSystem;
		return callback && callback(null);
	});
}

function createMeeting(bean, callback) {
	let {input, output} = bean;
	requestZoomCreateMeeting(input.zoomConfig, (err, result) => {
		if (err) {
			return callback && callback(err);
		}
		output.result = result;
		return callback && callback(null);
	});
}

function listRecords(bean, callback){
  let {output} = bean;
  //let queryEndTime = moment(input.queryStartTime).add(input.daysRange, 'days');
  let where = {
    'valid': true,
    //'startTime': {'$gte': moment(input.queryStartTime), '$lt': queryEndTime}
  }
  //if(input.doctorId) where.doctorId = input.doctorId;
  MeetingRecordModel.find(where)
  .populate({
    path: 'meetingNumber',
    //select: ' -__target -__targetVer -valid -modifyTime -createTime',
    
  })
  //.sort({'startTime': 1})
  //.select(' -__target -__targetVer -consultantIdList')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result.filter(result => result.doctorId != null);
    callback && callback(null);
  });	
}

function saveDailyMeetingRecords(bean, callback){
	let {input, output} = bean;
	let sumResult;
	if(input.downloadDay){
		queryDay = input.downloadDay;
	}else{
		let now = new Date();
		queryDay = moment(new Date(now.setDate(now.getDate()-1))).startOf('day').format("YYYY-MM-DD");
	}
	logger.info('[saveDailyMeetingRecords] ===============START================ queryDay: ', queryDay);
	let zoomAccountsResult, recordingResult;
	async.series({
		findAllZoomAccouts: (cb)=> {
			let where = {
				'valid': true
			}
			ZoomAccountModel.find(where)
			.select(' -__target -__targetVer -isOccupied -valid -password')
			.exec((err, result) => {
				if(err) return callback && callback(err);
				if(!result) return callback && callback({name:'DataNotFound'});
				zoomAccountsResult = result;
				//console.log('[findAllZoomAccouts] zoomAccountsResult: ', zoomAccountsResult);
				cb();
			});
		},
		getRecordings: (cb)=> {
			async.mapLimit(zoomAccountsResult, 1, getRecordingsEachZoomAccount, (err, results)=>{
				if (err) return callback && callback(err);
				recordingResult = results[0];
				logger.info('[getRecordings] total videos counts: ', recordingResult.length);
				//logger.info('[getRecordings] recordingResult: ', recordingResult[0]);
				cb();
			});
		},
		saveAndDownloadMeetingRecord: (cb)=> {
			async.mapLimit(recordingResult, 5, saveAndDownloadEachRecord, (err, results)=>{
				if (err) return callback && callback(err);
				
				sumResult = results;
				cb();
			});
		}
	}, function(err) {
		if (err) callback(err);
		logger.info('[saveDailyMeetingRecords] sumResult: ', sumResult);
		output.result = sumResult;
		saveLogs(queryDay, sumResult, ()=>{});
		callback && callback(null);
	});
}

function getRecordingsEachZoomAccount(data, cb){
	let meetingsResults = [];
	let fileResults = [];
	let meetingCounts = 0;
	let nextPageToken = null;
	async.doDuring(
		(msgCallback)=>{
			requestListAllRecordings(queryDay, nextPageToken, data, (err, result)=>{
				if (err) return cb(err, null);
				if(result && result.meetings && result.meetings.length){
					meetingsResults = meetingsResults.concat(result.meetings);
					meetingCounts = result.meetings.length;
					console.log(" [getRecordingsEachZoomAccount] meetingCounts: ", meetingCounts);
					if(result.next_page_token) {
						console.log(" [getRecordingsEachZoomAccount] next_page_token: ", result.next_page_token);
						nextPageToken = result.next_page_token;
					}else{
						console.log("==================== [getRecordingsEachZoomAccount] finish!!! zoomAccount: ", data.zoomAccount);
						meetingsResults.forEach((element)=>{
							element.recording_files.forEach((ele)=>{
								ele.meetingNumber = element.id;
								ele.fileId = ele.id;
								ele.meetingUUID = ele.meeting_id;
								ele.host_id = element.host_id;
								ele.topic = element.topic;
								ele.duration = element.duration;
								ele.zoomAccount = data.zoomAccount;
							});
							fileResults = fileResults.concat(element.recording_files);
						});
						//console.log("==================== [getRecordingsEachZoomAccount] meetingsResults: ", meetingsResults);
						return cb(null, fileResults);
					}
				}
				msgCallback();
			});
		},
		(msgCallback)=>{  //post-check
			return msgCallback(null, (meetingCounts == LIST_RECORDING_PAGE_SIZE));
		},
		()=>{
			console.log("==================== [getRecordingsEachZoomAccount] finish!!! zoomAccount: ", data.zoomAccount);
			meetingsResults.forEach(function (element) {
				element.zoomAccount = data.zoomAccount;
			});
			return cb(null, meetingsResults);
		}
	);	
}

function saveAndDownloadEachRecord(data, callback){
	const fileName = uuidv4()+'_'+data.fileId+'_'+moment(data.recording_start).format("YYYY-MM-DD_HH-mm")+'.'+data.file_type.toLowerCase();
	let saveRecordResult, updateResult;
	async.series({
		checkRecordDuplicate: (cb)=> {
			let where = {
				'valid': true,
				'fileId': data.fileId,
				'meetingUUID': data.meetingUUID,
			}
			MeetingRecordModel.findOne(where)
			.exec((err, result) => {
				if(err) return callback(null, err);
				if(result) {
					let response = {
						'zoomAccount': data.zoomAccount,
						'meetingNumber': data.meetingNumber,
						'meetingUUID': data.meetingUUID,
						'fileId': data.fileId,
						'updateResult': 'Recording Duplicate!'
					}
					return callback(null, response);
				}
				cb();
			});
		},	
		downloadRecord: (cb)=> {
			const filePath = path.join(__dirname, `${MP4_OUTPUT_FOLDER_PATH}`) + fileName;
			download(data.download_url).then(file => {
				fs.writeFileSync(filePath, file);
				cb();
			});
		},		
		saveRecordModel: (cb)=> {
			let saveData = {
				'queryDay': queryDay,
				'zoomUserId': data.host_id,
				'topic': data.topic,
				'fileId': data.fileId,
				'fileType': data.file_type,
				'fileName': fileName,
				'recordingStartTime': data.recording_start,
				'recordingEndTime': data.recording_end,
				'meetingAllDuration': data.duration,
				'mp4PlayUrl': data.play_url,
				'mp4DownloadUrl': data.download_url,
				'meetingNumber': data.meetingNumber,
				'meetingUUID': data.meetingUUID,
				'zoomMeetingData': data
			}
			new MeetingRecordModel(saveData).save((err, result) => {
				if (err) return callback(null, err);
				if (!result) return callback(null, {name: 'CreateError'});
				saveRecordResult = result;
				cb();
			});
		},
		updateAppointmentOfVideoFile: (cb)=> {
			let where = {
				//'meetingNumber': saveRecordResult.meetingNumber,
				'meetingUUID': saveRecordResult.meetingUUID
			}
			let updateData = {
				'meetingRecordId': saveRecordResult._id
			}
			AppointmentModel.update(where, {'$addToSet': updateData}, (err, result)=>{
				if (err) return callback(null, err);
				updateResult = result;
				cb();
			});
		}
	}, function(err) {
		if (err) callback(err, null);
		let response = {
			'zoomAccount': data.zoomAccount,
			'updateResult': updateResult,
			'meetingNumber':saveRecordResult.meetingNumber, 
			'meetingUUID': saveRecordResult.meetingUUID,
			'fileId': data.fileId,
		}
		callback(null, response);
	});
}

function saveLogs(queryDay, logs, callback){
	let saveData = {
		'queryDay': queryDay,
		'logs': logs
	}
	console.log(" [saveLogs] saveData: ", saveData);
	new ZoomLogsModel(saveData).save((result) => {
		console.log(" [saveLogs] result: ", result);
		callback();
	});
}