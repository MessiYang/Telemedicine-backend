import moment from 'moment';
import async from 'async';
import config from 'nconf';
import logger from '../config/log';
import OutpatientModel from '../models/outpatientModel';
import EmployeeModel from '../models/employeeModel';
import InviteRecordModel from '../models/inviteRecordModel';
import AppointmentModel from '../models/appointmentModel';
//import AppointmentType from '../models/type/appointmentType';
import OutPatientType from '../models/type/outpatientType';
import OutpatientTimeType from '../models/type/outpatientTimeType';
//import socketIOUtil from '../utils/socketIOUtil';
import {xmppSend} from '../utils/xmppUtil';
import {addUserOnlineStatus, noteFirstDoctorReadyMsg, pushMessage } from '../utils/stringUtil';
import { requestLiveMeetingList, requestGetRegScheduleByRegDate } from '../utils/httpUtil';
import {startRecording, getParticipantsAndCheck} from '../utils/vidyoUtil';
import defaultConf from '../config/defaultConf';
import mongoose from 'mongoose';
let {Types: {ObjectId}} = mongoose;

export {
  getOutpatientByRoom,
  listOutpatient,
  listWeeklyOutpatient,
  retrieve,
  checkTheSameOptTime,
  createOutpatient, 
  updateOutpatient,
  deleteOutpatient,

  getReadyOutpatient,
  getLiveRoomForShare,
  getOutPatientStatus,
  getTimeType,
  getConsultingDoctorList,
  getKMUHConsultingList,
  getInviteRecord,
  readInviteRecord,
  cancelCalling,
  replyInvite,
  startVidyoRecording,
  updateOutpatientStatus,
  startOutpatient,
  outpatientReady
};

const target = config.get('EXECUTE_TARGET');
const {KMUH_COMPANY_CODE} = config.get(target);
const WAITING_RESPONSE_TIME = 10;
//export let pullingCache = new NodeCache();

function getOutpatientByRoom(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true,
    'startTime': {'$gte': moment(input.queryStartTime).toDate(), '$lt': moment(input.queryEndTime).toDate()}
  }
  if(input.room) where.roomCode = input.room;
  if(input.roomCode) where.roomCode = input.roomCode;
  let aggregateArray = [];
  aggregateArray.push({
    $match: where
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Employee',
      'localField': 'doctorId',
      'foreignField': '_id',
      'as': 'doctorId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$doctorId',
      preserveNullAndEmptyArrays: true,
    }
  });
  if(input.deptCode){
    aggregateArray.push({
      $match: {
        'doctorId.departmentCode': input.deptCode
      }
    });
  }
  aggregateArray.push({
    $lookup: {
      'from': 'Company',
      'localField': 'doctorId.companyId',
      'foreignField': '_id',
      'as': 'doctorId.companyId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$doctorId.companyId',
      preserveNullAndEmptyArrays: true,
    }
  });
  if(input.companyCode){
    aggregateArray.push({
      $match: {
        'doctorId.companyId.code': input.companyCode.toLowerCase()
      }
    });
  }
  OutpatientModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log('[getOutpatientByRoom] result: ', result);
    input.outpatientList = result;
    return callback && callback(null);
  });
}

function listOutpatient(bean, user, callback){
  let { input, output} = bean;
  //console.log('[listOutpatient] input: ', input);
  let companyId = user.companyId;
  if(input.companyId) companyId = input.companyId;
  let queryEndTime = moment(input.queryStartTime).add(input.daysRange*24, 'hours');
  let where = {
    'valid': true,
    'startTime': {'$gte': moment(input.queryStartTime), '$lt': queryEndTime}
  }
  if(input.doctorId) where.doctorId = input.doctorId;
  if(input.room) where.roomCode = input.room;
  if(input.roomCode) where.roomCode = input.roomCode;
  console.log('[listOutpatient] where: ', where);
  OutpatientModel.find(where)
  .populate({
    path: 'doctorId',
    select: ' -__target -__targetVer -valid -modifyTime -createTime -accountId -code -role -isInMeeting -isReceiveNotification',
    match: {'companyId': companyId},
    populate: {
      path: 'companyId',
      select: ' -__target -__targetVer -valid -modifyTime -createTime -address -phone -code',
    }
  })
  .sort({'startTime': 1})
  .select(' -__target -__targetVer -consultantIdList -valid -modifyTime')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result.filter(result => result.doctorId != null);
    input.outpatientList = output.result;
    callback && callback(null);
  });
}

function listWeeklyOutpatient(bean, callback){
  let { input, output} = bean;
  let now = new Date();
  let queryEndTime = moment(input.queryStartTime).add(7, 'days');
  const offsetInMilliSecond = moment().utcOffset() * 60 * 1000;
  console.log('queryStartTime: ', input.queryStartTime);
  console.log('queryEndTime: ', String(queryEndTime));
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      'startTime': {'$gte': moment(input.queryStartTime).toDate(), '$lt': queryEndTime.toDate()},
      'endTime' :  {'$gte': moment(now).toDate()},
    }
  });
  if (input.department && input.department.length){
    aggregateArray.push({
      $match:{
        'department': input.department,
      }
    });
  }
  if (input.doctorId && input.doctorId.length){
    let objIdArray = []
    input.doctorId.map((doctorId)=>{
      objIdArray.push(ObjectId(doctorId));
    })
    aggregateArray.push({
      $match:{
        'doctorId': {'$in': objIdArray},
      }
    });
  }
  aggregateArray.push({
    $lookup: {
      'from': 'Employee',
      'localField': 'doctorId',
      'foreignField': '_id',
      'as': 'doctorId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$doctorId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Company',
      'localField': 'doctorId.companyId',
      'foreignField': '_id',
      'as': 'doctorId.companyId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$doctorId.companyId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'dayOfWeek': { $dayOfWeek: { $add: [ '$startTime', offsetInMilliSecond ] } },// * dayOfWeek between 1 (Sunday) to 7 (Saturday) * //
      'hour': { $hour: { $add: [ '$startTime', offsetInMilliSecond ] } },// * hour between 0 to 23  * //
      'status': 1,
      'roomCode': 1,
      'department': 1,
      'isApplyToVHC': 1,
      'isApplyToDpay': 1,
      'isCounselingClinic': 1,
      'counselingPrice': 1,
      'startTime': 1,
      'endTime': 1,
      'signUpNumber': 1,
      'numberLimit': 1,
      'doctorName': 1,
      'doctorIntro': 1, 
      'doctorId._id': 1,
      'doctorId.name': {$ifNull: ["$doctorName", '$doctorId.name']},
      'doctorId.department': 1,
      'doctorId.companyId._id': 1,
      'doctorId.companyId.displayname': 1,
      'doctorId.companyId.region': 1,
      'doctorId.companyId.agreementURL': 1,
    }
  });
  aggregateArray.push({
    $addFields: {
      'isFull': {$cond: [{$gte: ['$signUpNumber', '$numberLimit']}, true, false]},
      'timeType': {$cond: [{$and: [{$gte: ['$hour', 5]}, {$lt: ['$hour', 12]}]}, OutpatientTimeType.MORNING.value,
                  {$cond: [{$and: [{$gte: ['$hour', 12]}, {$lt: ['$hour', 17]}]}, OutpatientTimeType.AFTERNOON.value,
                  OutpatientTimeType.NIGHT.value]}]},
      // 'en-US': {$cond: [{$lt: ['$hour', 12]}, 'Morning',
      //          {$cond: [{$and: [{$gte: ['$hour', 12]}, {$lt: ['$hour', 18]}]}, 'AfterNoon',
      //          'Night']}]},
      // 'zh-TW': {$cond: [{$lt: ['$hour', 12]}, '上午診',
      //           {$cond: [{$and: [{$gte: ['$hour', 12]}, {$lt: ['$hour', 18]}]}, '下午診',
      //           '晚診']}]},
    }
  });
  aggregateArray.push({
    $sort: {
      'startTime': 1,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': {
        'dayOfWeek': '$dayOfWeek',
        'timeType': '$timeType'
        // 'en-US': '$en-US',
        // 'zh-TW': '$zh-TW',
      },
      'date':{ $first: '$startTime'},
      'doctorList': { $push: {
        '_id': '$_id',
        //'hour': '$hour',
        'status': '$status',
        'roomCode': '$roomCode',
        'isFull': '$isFull',
        'department': '$department',
        'isApplyToVHC': '$isApplyToVHC',
        'isApplyToDpay': '$isApplyToDpay',
        'isCounselingClinic': '$isCounselingClinic',
        'counselingPrice': '$counselingPrice',
        'startTime': '$startTime',
        'endTime': '$endTime',
        'doctorId': '$doctorId'
      }}
    }
  });
  aggregateArray.push({
    $sort: {
      '_id.timeType': 1
    }
  });
  aggregateArray.push({
    $group: {
      '_id': {
        'dayOfWeek': '$_id.dayOfWeek',
      },
      'date':{ $first: '$date'},
      'clinicInfo': { $push: {
        'doctorList': '$doctorList',
        'timeType': '$_id.timeType'
        // 'en-US': '$_id.en-US',
        // 'zh-TW': '$_id.zh-TW',
      }}
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'dayOfWeek': '$_id.dayOfWeek',
      'clinicInfo': 1,
      'date': 1
    }
  });
  aggregateArray.push({
    $sort: {
      'date': 1,
    }
  });
  OutpatientModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log('result: ', result);
    output.result = result;
    callback && callback(null);
  });
}

function retrieve(bean, callback){
  let { input, output} = bean;
  let where = {
    'valid': true,
    '_id': input.outpatientId
  }
  OutpatientModel.findOne(where)
  .populate({
    path: 'doctorId',
    select: ' -__target -__targetVer -valid -modifyTime -createTime',
    populate: {
      path: 'companyId',
      select: ' -__target -__targetVer -valid -modifyTime -createTime -address -phone',
    }
  })
  .select(' -__target -__targetVer -consultantIdList')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log('[retrieve]  result: ', result);
    input.outpatientData = result;
    output.result = result;
    callback && callback(null);
  });
}

function checkTheSameOptTime(bean, callback){
  let { input, output} = bean;
  let startTimeOverlap = {
    'startTime':  {'$gte': moment(input.outpatientList[0].startTime).toDate(), '$lt': moment(input.outpatientList[0].endTime).toDate()}
  }
  let endtTimeOverlap = {
    'endTime':  {'$gt': moment(input.outpatientList[0].startTime).toDate(), '$lte': moment(input.outpatientList[0].endTime).toDate()}
  }
  let withinTime = {
    '$and':  [
      {'startTime':  {'$lte': moment(input.outpatientList[0].startTime).toDate()}},
      {'endTime':  {'$gte': moment(input.outpatientList[0].endTime).toDate()}}]
  }
  let where = {
    'valid': true,
    'doctorId': input.outpatientList[0].doctorId,
    '$or': [ startTimeOverlap, endtTimeOverlap, withinTime] 

  }
  console.log('[checkTheSameOptTime]  where: ', where);
  OutpatientModel.findOne(where)
  .select(' -__target -__targetVer -consultantIdList')
  .exec((err, result) => {
    console.log('[checkTheSameOptTime]  result: ', result);
    if(err) return callback && callback(err);
    if(result) return callback && callback({name:'OptTimeOverlap'});
    callback && callback(null);
  });
}

function createOutpatient(bean, callback) {
  let {input, output} = bean;
  //console.log('[createOutpatient]  input: ', input);
  checkInputOutpatients(input.outpatientList, (err)=>{
    if (err) return callback && callback({name: 'ParamMalformedError'});
    OutpatientModel.insertMany(input.outpatientList, {ordered: false}, (err, result) => {
      if (err) return callback && callback(err);
      console.log('[createOutpatient]  result: ', result);
      output.result = result;
      callback && callback(null);
    });  
  });
}
function checkInputOutpatients(data, callback){
  let err = false;
  data.forEach((ele) => {
    if (!ele.department || !ele.startTime || !ele.endTime || !ele.doctorId){
      err = true;
    }else if( moment(ele.endTime).isBefore(ele.startTime) || moment(ele.endTime).isSame(ele.startTime)){
      err = true;
    }else{
      ele.modifyTime = new Date();
      ele.createTime = new Date();
    }
  });
  return callback(err);
}

function updateOutpatient(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.outpatientId
  }
  let updateData = input;
  OutpatientModel.update(where, {$set: updateData}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('[clientLogin]  result: ', result);
    return callback && callback(null);
  });
}

function deleteOutpatient(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true,
    '_id': input.outpatientId
  }
  let updateData = {
    'valid': false,
    'invalidTime': new Date()
  };
  OutpatientModel.update(where, {$set: updateData}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('[clientLogin]  result: ', result);
    return callback && callback(null);
  });
}

function getReadyOutpatient(bean, user, callback) {
  let {input, output} = bean;
  //console.log('[getReadyOutpatient] input:', input); 
  let nowDate =  new Date();
  let queryEndTime = moment(nowDate).subtract( 3 , 'hours');
  //console.log('user._id', user._id);
  let where = {
    'valid': true,
    'doctorId': user._id,
    'endTime': {'$gte': queryEndTime},
    'status' : {'$in': [OutPatientType.UPCOMING.value, OutPatientType.READY.value]}
  }; 
  if(input.department) where['department'] = input.department;
  OutpatientModel.find(where)
  .select('-valid -modifyTime -createTime -consultantIdList -meetingNumber -meetingUUID')
  .populate({
    path: 'doctorId',
    select: '_id name companyId email isReceiveNotification',
    populate:{
      path: 'companyId',
      select: '_id code displayname'
    }
  })
  .sort({'startTime': 1})
  .exec((err, result) => {
    let data = {};
		if (err) {
			return callback && callback(err);
		} else if (!result || !result[0]) {
      //return callback && callback({name: 'DataNotFound'});
      data.outpatientData = null;
      data.zoomConfig = input.zoomConfig;
      output.result = data;
			return callback && callback(null);
		} else {
      //initialZoomAccounts(user.companyId);
      data.outpatientData = JSON.parse(JSON.stringify(result[0]));
      if (data.outpatientData.doctorName) data.outpatientData.doctorId.name = data.outpatientData.doctorName;
      data.zoomConfig = input.zoomConfig;
      output.result = data;
      //console.log(data);
			return callback && callback(null);
		}
  });
}

function getLiveRoomForShare(bean, user, callback){
  let {input, output} = bean;
  if(user.meetingSystem == "vidyo") {
    let where = {
      'valid': true,
      '_id': user._id
    }
    EmployeeModel.findOne(where)
    .select('currentVidyoPin currentVidyoRoomUrl')
    .exec((err, result) => {
      if(err) return callback && callback(err);
      console.log('[findLiveMeeting] result:', result);
      if(!result.currentVidyoRoomUrl || result.currentVidyoRoomUrl == '0') return callback && callback({name:'NoLiveMeeting'});
      let data = {};
      data.vidyoRoomUrl = result.currentVidyoRoomUrl;
      data.vidyoPin = result.currentVidyoPin;
      output.result = data;
      return callback && callback(null);
    });
  }else{
    let data = input.zoomConfig;
    let where = {
      'valid': true,
      '_id': user._id
    }
    EmployeeModel.findOne(where)
    .select('meetingNumber')
    .exec((err, result2) => {
      if(err) return callback && callback(err);
      console.log('[findLiveMeeting] result2:', result2);
      if(!result2.meetingNumber || result2.meetingNumber == '0') return callback && callback({name:'NoLiveMeeting'});
      data.meetingNumber = result2.meetingNumber;
      output.result = data;
      return callback && callback(null);
    });
    // requestLiveMeetingList(input.zoomConfig, (err, result)=>{
    //   if(err) return callback && callback(err);
    //   if(!result) return callback && callback({name: 'NoLiveMeeting'});
    //   console.log('[findLiveMeeting] result:', result);
    //   if(result.meetings.length){
    //     data.meetingNumber = result.meetings[0].id;
    //     output.result = data;
    //     return callback && callback(null);
    //   }else{
    //   }
    // });
  }
}

function getOutPatientStatus(bean, callback) {
  let {output} = bean;
  let data = {};
  data.outPatientStatusList = OutPatientType.toOutput()
  output.result = data;
  return callback && callback(null);
}

function getTimeType(bean, callback) {
  let {output} = bean;
  let data = {};
  data.timeTypeList = OutpatientTimeType.toOutput()
  output.result = data;
  return callback && callback(null);
}

function getConsultingDoctorList(bean, user, callback){
  let {input, output} = bean;
  //console.log('user.companyId', user.companyId);
  let where = {
    'valid': true,
    '_id': {'$ne': user._id},
    'role': 128,
  }; 
  if(user.serviceGroupId) {
    where['$or'] = [{serviceGroupId: {'$in': user.serviceGroupId}}, { companyId: user.companyId}] 
  }else{
    where['companyId'] = user.companyId;
  }
  //if(input.companyIds) where['companyId'] = {'$in': input.companyIds};
  if(input.department) where['department'] = input.department;
  EmployeeModel.find(where)
  .select('_id hospital name department employeeNumber departmentCode isReceiveNotification isInMeeting hospitalCode isConnectNote')
  .populate({
    path: 'companyId',
    select: '_id code displayname', 
  })
  .exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result || !result[0]) {
			return callback && callback({name: 'DataNotFound'});
		} else {
      let data = {};
      addUserOnlineStatus(result, null, (err, results)=>{
        if (err) return callback && callback(err);
        data.doctorList = results;
        data.doctorList.forEach((ele) => {
          if(ele.departmentCode || ele.hospitalCode) ele.kmuhData = {};
          if(ele.hospitalCode) ele.kmuhData.hospital = ele.hospitalCode;
          if(ele.departmentCode) ele.kmuhData.deptCode = ele.departmentCode;
        });
        output.result = data
        return callback && callback(null);
      });
		}
  });
}

function getKMUHConsultingList(bean, token, callback){
  let {output} = bean;
  let companyCodes = [];
  output.result.doctorList.forEach(element => {
    companyCodes.push(element.companyId.code);
  });
  console.log("companyCodes: ", companyCodes);
  if (!companyCodes || !companyCodes.includes(KMUH_COMPANY_CODE)) return callback && callback(null);
  requestGetRegScheduleByRegDate(KMUH_COMPANY_CODE, token, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result || !result.length) return callback && callback(null);
    if (result[0].status != "done") return callback && callback(null);
    let data = [];
    output.result.doctorList.forEach((ele) => {
      let pushData;
      if(ele.companyId.code == KMUH_COMPANY_CODE){
        result.forEach((kmuhData) => {
          if(ele.departmentCode == kmuhData.deptCode ||ele.employeeNumber == kmuhData.doctorId) {
            ele.kmuhData = kmuhData;
            pushData = JSON.parse(JSON.stringify(ele));
            if(kmuhData.noonNo == '0'){
              pushData.department = pushData.department +" 早診"
            }else if(kmuhData.noonNo == '1'){
              pushData.department = pushData.department +" 午診"
            }else if(kmuhData.noonNo == '2'){
              pushData.department = pushData.department +" 晚診"
            }
            data.push(pushData);
          }
        });
      }else{
        pushData = JSON.parse(JSON.stringify(ele));
        data.push(pushData);
      }
    });
    output.result.doctorList = data;
    return callback && callback(null);
  })
}

function getInviteRecord(bean, user, callback){
  let {output} = bean;
  let where = {
    'valid': true,
    //'$or': [ { launchDoctorId: user._id }, { invitedDoctorId: user._id } ] 
    'invitedDoctorId': user._id
  }; 
  InviteRecordModel.find(where)
  .populate({
    path: 'launchDoctorId',
    select: '_id name companyId email isReceiveNotification isInMeeting department isConnectNote',
    //match: {'valid': true},
  })
  .populate({
    path: 'invitedDoctorId',
    select: '_id name companyId email isReceiveNotification isInMeeting department isConnectNote',
    //match: {'valid': true},
  })
  .sort({'createTime': -1})
  .select('-valid -modifyTime')
  .limit(30)
  .exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result || !result[0]) {
      output.result = {'inviteRecord':[],'missedCallCounts':0,'unReadCounts':0};
			return callback && callback(null);
		} else {
      let data = {};
      addUserOnlineStatus(result, 'launchDoctorId', (err, results)=>{
        if (err) return callback && callback(err);
        data.inviteRecord = results;
        data.missedCallCounts = countMissedCall(user._id, result);
        data.unReadCounts = countUnRead(user._id, result);
        output.result = data
        return callback && callback(null);
      });
		}
  });  
}
function countMissedCall(invitedDoctorId, record){
  let count = 0;
  record.forEach((element) => {
    if (element.invitedDoctorId._id == invitedDoctorId && element.isMissedCall == true){
      count++;
    }
  });
  return count;
}
function countUnRead(invitedDoctorId, record){
  let count = 0;
  record.forEach((element) => {
    if (element.invitedDoctorId._id == invitedDoctorId && element.haveRead == false){
      count++;
    }
  });
  return count;
}

function readInviteRecord(bean, user, callback){
  let {input} = bean;
  let where = {
    'valid': true, 
    'invitedDoctorId': user._id,
    'createTime': {'$lte': input.lastCreateTime}
  }
  InviteRecordModel.updateMany(where,
  {$set: {'haveRead': true}}, {multi: true}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'DataNotFound'});
    console.log('[readInviteRecord] result: ', result);
    return callback && callback(null);
  });
}

function cancelCalling(bean, user, callback){
  let {input} = bean;
  console.log('input: ', input);
  //let limitTime = moment().subtract(WAITING_RESPONSE_TIME, 'm');
  let where = {
    'valid': true,
    'launchDoctorId': user._id,
    //'createTime': {'$gte': limitTime}
  }
  if(input.meetingNumber) where.meetingNumber = input.meetingNumber; 
  if(input.vidyoRoomUrl) where.vidyoRoomUrl = input.vidyoRoomUrl; 
  let updateData = {
    'isMissedCall': true
  }
  InviteRecordModel.findOneAndUpdate(where, updateData, {sort: { 'createTime': -1 }}, (err, updateResult) => {
    console.log('updateResult: ', updateResult);
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    let userId;
    if (updateResult.invitedDoctorId) {
      userId = updateResult.invitedDoctorId;
    }else {
      userId = updateResult.invitedPatientId;
    }
    const EVENT =  'cancelCalling/id/' + userId; 
    let msg = {}
    if(input.meetingNumber) msg.meetingNumber = input.meetingNumber; 
    if(input.vidyoRoomUrl) msg.vidyoRoomUrl = input.vidyoRoomUrl; 
    xmppSend(userId, EVENT, msg, (result)=>{
      if(result=='success'){
        return callback && callback(null);
      }else{
        return callback && callback({name: 'ClientOffLine'});
      }
    });
  });   
}

function replyInvite(bean, user, callback){
  let {input, output} = bean;
  if(user.meetingSystem == "vidyo") {
    if(!input.vidyoRoomUrl||!input.vidyoPin) return callback && callback({name: 'ParamMalformedError'});
  }else{
    if(!input.meetingNumber) return callback && callback({name: 'ParamMalformedError'});
  }
  let limitTime = moment().subtract(WAITING_RESPONSE_TIME, 'm');
  let where = {
    'valid': true,
    'createTime': {'$gte': limitTime}
  }
  if(input.vidyoRoomUrl) where.vidyoRoomUrl = input.vidyoRoomUrl;
  if(input.vidyoPin) where.vidyoPin = input.vidyoPin;
  if(input.meetingNumber) where.meetingNumber = input.meetingNumber;
  if(user.code == 'c') {
    where.invitedPatientId = user._id;
  }else{
    where.invitedDoctorId = user._id;
  }
  console.log('where: ', where);
  let updateData = {
    'isMissedCall': true
  }
  if(input.isAccept == true) {
    updateData.isMissedCall = false;
    updateData.haveRead = true;
  }
  InviteRecordModel.findOneAndUpdate(where, updateData, (err, updateResult) => {
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    let EVENT;
    let msg = {}
    if(input.vidyoRoomUrl) msg.vidyoRoomUrl = input.vidyoRoomUrl;
    if(input.meetingNumber) msg.meetingNumber = input.meetingNumber;
    if(input.isAccept == true) {
      output.updateResult = updateResult;
      EVENT = 'acceptInviteMeeting/id/' + updateResult.launchDoctorId;
      if(input.vidyoRoomUrl) acceptInviteMeeting(null, input.vidyoRoomUrl);
      if(input.meetingNumber) acceptInviteMeeting(input.meetingNumber, null);
    }else{
      EVENT = 'rejectInviteMeeting/id/' + updateResult.launchDoctorId; 
    }
    console.log('EVENT: ', EVENT);
    xmppSend(updateResult.launchDoctorId, EVENT, msg, (result)=>{
      if(result=='success'){
        console.log('[replyInvite] socket send: success!!');
      }else{
        console.log('[replyInvite] socket send: fail!!');
      }
    });
    return callback && callback(null);
  });    
}

function startVidyoRecording(bean, callback){
  let {input} = bean;
  if(input.isAccept == false) return callback && callback(null);
  if(!input.vidyoRoomUrl||!input.vidyoPin) return callback && callback(null);
  console.log('input: ', input);
  let where = {
    'valid': true,
    'vidyoRoomUrl': input.vidyoRoomUrl,
    'vidyoPin': input.vidyoPin,
  }
  AppointmentModel.findOne(where)
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    if(!result.vidyoRoomID) return callback && callback({name:'ParamMalformedError'});
    console.log('!!!!!!!result: ', result);
    startRecording(result.vidyoRoomID, (err, result2)=>{
      if(err) logger.info('[startVidyoRecording] err:', err);
      logger.info('[startVidyoRecording] option:', result2);

      getParticipantsAndCheck(result.vidyoRoomID, (error, result3)=>{
        if(err) logger.info('[getParticipantsAndCheck] err:', error);
        logger.info('[getParticipantsAndCheck] option:', result3);
      });  
    });
    callback && callback(null);
  });
}

function acceptInviteMeeting(meetingNumber, vidyoRoomUrl){
  let query = {
    'valid': true,
    'isAcceptInviteMeeting': false
    //"doctorId" : updateResult.launchDoctorId,
    //'createTime': {'$gte': limitTime}
  }
  if(vidyoRoomUrl) query.vidyoRoomUrl = vidyoRoomUrl;
  if(meetingNumber) query.meetingNumber = meetingNumber;
  //console.log('query: ', query);
  AppointmentModel.updateMany(query, {$set: {'isAcceptInviteMeeting': true}}, (err, result)=>{
    if (err) logger.info('[rejectInviteMeeting] update appointment fail! err:', err);
    console.log('[rejectInviteMeeting]  update appointment result: ', result);
  });
}

function startOutpatient(bean, callback) {
  let {input, output} = bean;
  let where = {
    'valid': true
  }; 
  if(input.department) where['department'] = input.department;
  if(input.doctorId) where['doctorId'] = input.doctorId;
  OutpatientModel.find(where)
  .select('-valid')
  .sort({'startTime': 1})
  .exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			output.result = result;
			return callback && callback(null);
		}
  });
}

function updateOutpatientStatus(bean, callback){
  let {input, output} = bean;
  console.log('input: ', input);
  let where = {
    'valid': true,
    '_id': input.outpatientId
  }
  let updateData = {
    'status': input.status
  }
  OutpatientModel.findOneAndUpdate(where,
  updateData, (err, updateResult) => {
    console.log('updateResult: ', updateResult);
    if (err) return callback && callback(err);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    output.updateResult = updateResult;
    return callback && callback(null);
  });  
}

function outpatientReady(data, callback){
  let where = {
    'valid': true,
    '_id': data._id
  }
  let updateData = {
    'status': OutPatientType.READY.value
  }
  OutpatientModel.findOneAndUpdate(where,
  updateData, (err, updateResult) => {
    //console.log('data: ', data);
    if (err) return callback(err, null);
    if (!updateResult) return callback({name: 'DataNotFound'}, null);
    if(!data.doctorId || !data.doctorId.apnToken || !data.doctorId.fcmToken) return callback(null, updateResult);
    if(data.doctorId.apnToken.length||data.doctorId.fcmToken.length){
      let title = "門診即將開始"
      let msg = noteFirstDoctorReadyMsg(data);
      console.log('[notificationEach] msg: ', msg);
      pushMessage(true, data.doctorId.apnToken, data.doctorId.fcmToken, title, msg, null, 'e');
    }
    callback(null, updateResult);
  });  
}

