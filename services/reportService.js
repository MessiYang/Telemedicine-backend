import async from 'async';
import fs from 'fs';
import request  from 'request';
import compressing from 'compressing';
import path from 'path';
import rimraf from 'rimraf';
import config from 'nconf';
import uuidv4 from 'uuid/v4';
import moment from 'moment';
import jsonToExcel from 'json2xls';
import logger from '../config/log';
import defaultConf from '../config/defaultConf';
import { requestGetFilesUrl} from '../utils/httpUtil';
import {vidyoAuthHeader, recordsSearchRequest} from '../utils/vidyoUtil';
import { sendMail, sendMailAndSetSubject} from '../utils/emailUtil';
import { makeDirAtFTP, uploadToFTP} from '../utils/ftpUtil';
import { functions } from 'underscore';
import { getServiceGroupOfCompanyIds } from './companyService';

const target = config.get('EXECUTE_TARGET');
const {SIT_URL, REPORT_OUTPUT_FOLDER_PATH, VD_USERNAME, VD_PASSWORD, ALERT_RECEIVER_EMAIL} = config.get(target);
const ROUTE_URL = '/report/downloadRecordFilesZip';

export {
  filterNofileRecord,
  addVidyoAuth,
  generateConsultingRecordsExcel,
  getRecordFilesWithZipUrl,
  moveRecordFilesToFTPServer,

  compareFHIRData,
  createFHIRPatient,

  filterByFileUrl,
  sendAlert_NoFileUrl,
};
function filterNofileRecord(bean, callback) {
  let {input, output} = bean;
  //console.log("[generateConsultingRecordsExcel] output.result.recordsList: ", output.result.recordsList);
  if(!output.result.recordsList || !output.result.recordsList.length) return callback && callback(null);
  async.mapLimit(output.result.recordsList, 30, getFilesUrl, (err, results)=>{
    if (err) return callback && callback(err);
    console.log("[filterNofileRecord]@@@@@@@ input.isShowNoFile: ", input.isShowNoFile);
    if(!input.isShowNoFile){
      results = results.filter( (el)=>{
        return el.fileUrl.length != 0;
      });   
    }
    //console.log("[generateConsultingRecordsExcel] results2: ", results);
    output.result.recordsList = results;
    return callback && callback(null);
  });
}

function addVidyoAuth(bean, callback){
  let {output} = bean;
  output.result.vidyoAuthorization = vidyoAuthHeader(VD_USERNAME, VD_PASSWORD);
  return callback && callback(null);
}

function generateConsultingRecordsExcel(bean, callback) {
  let {input, output} = bean;
  //console.log("[generateConsultingRecordsExcel] output.result.recordsList: ", output.result.recordsList);
  if(!output.result.recordsList || !output.result.recordsList.length) return callback && callback(null);
  async.mapLimit(output.result.recordsList, 30, getFilesUrl, (err, results)=>{
    if (err) return callback && callback(err);
    //console.log("[generateConsultingRecordsExcel] results: ", results);
    results = results.filter( (el)=>{
      return el.fileUrl.length != 0;
    });
    console.log("[generateConsultingRecordsExcel] results2: ", results);
    let fileName = json2ExcelFile(insertConsultingRecords2ExcelRow(results));
    console.log("[generateConsultingRecordsExcel] fileName: ", fileName);
    input.fileName = fileName;
    return callback && callback(null);
  });
}
function getFilesUrl(data, cb){
  let resData ;
  resData = data;
  resData.fileUrl = [];
  if (data._id && data.vidyoRoomUrl){
    recordsSearchRequest(data._id, (err, result)=>{
      if(err) {
        return cb(null, resData);
      }else if(result){  
        resData.fileUrl = result;
        return cb(null, resData);
      }else{
        return cb(null, resData);
      }
    });
  }else if(data.meetingData && data.meetingData.length){
    async.mapLimit(data.meetingData, 10, getEachMeetingNumber, (err, results)=>{
      if(err) {
        return cb(null, resData);
      }
      let fileUrlList = [];
      results.forEach((ele) => {
        if(ele && ele.length) fileUrlList = fileUrlList.concat(ele);
      });
      console.log("[getFilesUrl] fileUrlList: ", fileUrlList);
      if(fileUrlList && fileUrlList.length){  
        resData.fileUrl = fileUrlList;
        return cb(null, resData);
      }else{
        return cb(null, resData);
      }
    });
  }else{
    return cb(null, resData);
  }
}

function getEachMeetingNumber(data, cb){
  requestGetFilesUrl(data.meetingNumber, data.startTime, (err, result)=>{
    if(err) {
      return cb(null, null);
    }else if(result && result.success == true){  
      return cb(null, result.data);
    }else{
      return cb(null, null);
    }
  });
}

function insertConsultingRecords2ExcelRow(input){
  let resultArray = [];
  input.forEach(ele => {
    let json = {};
    json['??????'] = '';
    json['??????'] = '';
    json['??????????????????'] = '';
    json['??????'] = '';
    json['?????????'] = '';
    json['???????????????'] = '';
    json['????????????/??????'] = '';
    json['????????????'] = '';
    json['????????????'] = '';
    json['????????????'] = '';
    json['????????????2'] = '';
    json['????????????3'] = '';
    json['????????????'] = '';
    json['????????????'] = '';
    if(ele.doctorId.companyId && ele.doctorId.companyId.displayname) json['??????'] = ele.doctorId.companyId.displayname;
    if(ele.doctorId.department) json['??????'] = ele.doctorId.department;
    if(ele.createTime) json['??????????????????'] = moment(ele.createTime).format("YYYY-MM-DD HH:mm");
    if(ele.doctorId.name) json['??????'] = ele.doctorId.name;
    if(ele.patientId){
      if(ele.patientId.name) json['?????????'] = ele.patientId.name;
      if(ele.patientId.personalId) json['???????????????'] = ele.patientId.personalId;
    }
    if(ele.patientPID) json['????????????/??????'] = ele.patientPID;
    if(ele.consultantDoctorId[0]) {
      if(ele.consultantDoctorId[0].companyId && ele.consultantDoctorId[0].companyId.displayname) json['????????????'] = ele.consultantDoctorId[0].companyId.displayname;
      if(ele.consultantDoctorId[0].department) json['????????????'] = ele.consultantDoctorId[0].department;
      if(ele.consultantDoctorId[0].name)json['????????????'] = ele.consultantDoctorId[0].name;
    }
    if(ele.consultantDoctorId[1]) json['????????????2'] = ele.consultantDoctorId[1].name;
    if(ele.consultantDoctorId[2]) json['????????????3'] = ele.consultantDoctorId[2].name;
    if(ele.fileUrl) {
      let splitData = String(ele.fileUrl).split("/");
      let filepath = String(ele.fileUrl).split("filepath=");
      json['????????????'] = splitData[splitData.length-1];
      json['????????????'] = filepath[filepath.length-1];
    }
    resultArray.push(json);
  });
  return resultArray;
}

function json2ExcelFile(jsonData){
  //console.log('[jsonToExcelFile] jsonData:', jsonData);
  let excel = jsonToExcel(jsonData);
  const fileName = uuidv4()+ '.xlsx';
  const targetPath = REPORT_OUTPUT_FOLDER_PATH + fileName ;
  const filePath = path.join(__dirname, targetPath);
  fs.writeFileSync(filePath, excel, 'binary');
  return fileName;
}

function getRecordFilesWithZipUrl(bean, user, callback) {
  let {output} = bean;
  let urlList = getRecordData(output.result.recordsList);
  if (!urlList.length) return callback && callback({name: 'DataNotFound'});
  //if (!user.email) return callback && callback({name: 'NoUserEmail'});
  let zipFileName = getZipFileName(urlList)+".zip";
  //urlList = [ "https://rc.healthplus.tw/recording/downloadVideo?filepath=/zoomrc/cmr-storage/replay/2020/08/20/94335025547/B72FFE4E-5CEB-46D2-9727-A3A297F9D6F8/GMT20200820-022414_FET_2020-08-20_10-23-12__1280x720.mp4"]
  const folderPath = path.join(__dirname, REPORT_OUTPUT_FOLDER_PATH + getZipFileName(urlList));
  createNewFolder(folderPath);
  async.mapLimit(urlList, 20, download, (err, results)=>{
    if(err) logger.info("[getRecordFilesWithZipUrl] async.mapLimit err: ", err);
    console.log('Finished Downloading' + results)
    compressing.zip.compressDir(folderPath, path.join(__dirname, REPORT_OUTPUT_FOLDER_PATH + zipFileName))
    .then(() => {
      console.log('success');
      let fileUrl = SIT_URL + ROUTE_URL + '?filename=' + zipFileName
      logger.info('[getRecordFilesWithZipUrl] fileUrl: ', fileUrl);
      // sendMail(user.email, user.name, fileUrl, (result)=>{
      //   logger.info('[getRecordFilesWithZipUrl] sendMail result: ', result);
      // });
      rimraf(folderPath, function (err) { 
        if(err) logger.info("[getRecordFilesWithZipUrl] Remove folderPath err: ", err);
        console.log("Remove folderPath done!"); 
      });
      output.result = {};
      output.result.fileUrl = fileUrl;
      return callback && callback(null);
    })
    .catch(err => {
      logger.info("[getRecordFilesWithZipUrl] compressing.zip.compressDir err: ", err);
    });
  });

  function download(record, callback){
    //var filename =  (new Date()).getTime() + url.split('/').pop();
    let filename = record.companyName+' '+record.meetingTime+' '+record.department+'_'+record.doctorName
    if(record.patientName) filename = filename+' '+record.patientName
    if(record.patientPID) filename = filename+'_'+record.patientPID
    if(record.doctor2Name) filename = filename+' '+record.doctor2Name;
    logger.info('[getRecordFilesWithZipUrl] Downloading: ', filename);
    let Options = {
      'url': record.url,
      'headers': {
        'Content-Type': 'text/xml;charset=UTF-8',
        'Authorization': vidyoAuthHeader(VD_USERNAME, VD_PASSWORD)
      }
    };
    request.get(Options)
    .on('error', function(err) {console.log(err)} )
    .pipe(fs.createWriteStream(folderPath +"/"+ filename +'.mp4'))
    .on('close', callback);
  }
}

function moveRecordFilesToFTPServer(bean, callback) {
  let {output} = bean;
  console.log('output.result.recordsList: ', output.result.recordsList);
  let urlList = getRecordData(output.result.recordsList);
  console.log('!!!!! urlList: ', urlList);
  if (!urlList.length) return callback && callback({name: 'DataNotFound'});
  let groupUrlList = groupCompanyCode(urlList);
  async.mapLimit(groupUrlList, 2, downloadByCompany, (err, results)=>{
    if(err) logger.info("[moveRecordFilesToFTPServer] err: ", err);
    logger.info("[moveRecordFilesToFTPServer] ALL Finish !!!!!!!!  results:", results);
    //return callback && callback(null);
  });
  output.result = groupUrlList;
  return callback && callback(null);
}

function downloadByCompany(data, callback){
  console.log('[downloadByCompany] data:', data)
  let urlList = data.urlList;
  let companyCode = data.groupCode;
  //urlList = [ "https://rc.healthplus.tw/recording/downloadVideo?filepath=/zoomrc/cmr-storage/replay/2020/08/20/94335025547/B72FFE4E-5CEB-46D2-9727-A3A297F9D6F8/GMT20200820-022414_FET_2020-08-20_10-23-12__1280x720.mp4"]
  const folderPath = path.join(__dirname, REPORT_OUTPUT_FOLDER_PATH + companyCode);
  createNewFolder(folderPath);
  async.mapLimit(urlList, 5, downloadEachFile, (err, results)=>{
    if(err) logger.info("[downloadByCompany] async.mapLimit err: ", err);
    logger.info('Finished Download!, ' + companyCode +', filesNumber:' +results.length)
    logger.info('Finished Download!, ' + companyCode +', results:' +results)
    rimraf(folderPath, function (err) { 
      if(err) logger.info("[downloadByCompany] Remove folderPath err: ", err);
      console.log("Remove folderPath done!"); 
    });
    return callback(null, companyCode);
  });
  function downloadEachFile(record, cb){
    let optType = '????????????';
    let filename = record.meetingTime+'-'+record.companyName+'-'+record.department+'-'+record.doctorName
    if(record.patientName) {
      filename = filename+'-'+record.patientName
      optType = '?????????';
    }
    if(record.patientPID) filename = filename+'-'+record.patientPID
    if(record.doctor2Name) filename = filename+'-'+record.doctor2Name;  
    filename = filename+' '+Math.floor((Math.random() * 1000000) + 1);
    logger.info('[downloadEachFile] Downloading: ', filename);

    let fileDirname = folderPath +"/"+ filename;

    let Options = {
      'url': record.url,
      'headers': {
        'Content-Type': 'text/xml;charset=UTF-8',
        'Authorization': vidyoAuthHeader(VD_USERNAME, VD_PASSWORD)
      }
    };
    request.get(Options)
    .on('error', function(err) {
      logger.info("[downloadByCompany] requestFile err: ", err);
      if(err) return cb(null, 'requestFile err');
    })
    .pipe(fs.createWriteStream(fileDirname+'.mp4'))
    .on('finish', ()=>{
      compressing.zip.compressFile(fileDirname+'.mp4', fileDirname+'.zip')
      .then(() => {
        console.log('compressFile success!');
        fs.unlinkSync(fileDirname+'.mp4');
        makeDirAtFTP(companyCode, optType, fileDirname+'.zip', filename+'.zip', ()=>{
          uploadToFTP(companyCode, optType, fileDirname+'.zip', filename+'.zip', (err, ftpResult)=>{
            if(err) return cb(null, 'uploadToFTP err');
            console.log("Remove Zip file!"); 
            fs.unlinkSync( fileDirname+'.zip');
            return cb(null, ftpResult);
          });
        });
      })
      .catch(err => {
        logger.info("[downloadByCompany] compressing.zip.compressDir err: ", err);
        if(err) return cb(null, 'compressFile err');
      });
    });
  }
}

function groupCompanyCode(dataList){
  //console.log('[groupCompanyCode] dataList: ', dataList);
  let result = dataList.reduce((r, { groupCode: groupCode, ...object }) => {
    var temp = r.find(o => o.groupCode === groupCode);
    if (!temp) r.push(temp = { groupCode, urlList: [] , urlNumber:0});
    temp.urlList.push(object);
    temp.urlNumber = temp.urlNumber +1;
    return r;
  }, []);
  console.log('[groupCompanyCode]  result: ', result);
  return result;
}

function createNewFolder(folderDir){
  if (!fs.existsSync(folderDir)){
    fs.mkdirSync(folderDir);
  }
}

function getRecordData(recordsList){
  let meetingDataList = [];
  recordsList.forEach(function(ele){
    if(ele.fileUrl.length){
      let recordsData = {};
      if(ele.doctorId){
        if(ele.doctorId.name) recordsData.doctorName = ele.doctorId.name;
        if(ele.doctorId.department) recordsData.department = ele.doctorId.department;
        if(ele.doctorId.companyId && ele.doctorId.companyId.displayname) recordsData.companyName = ele.doctorId.companyId.displayname;
        if(ele.doctorId.companyId && ele.doctorId.companyId.code) recordsData.companyCode = ele.doctorId.companyId.code;
        if(ele.doctorId.companyId && ele.doctorId.companyId.code) recordsData.groupCode = ele.doctorId.companyId.code;
        if(ele.doctorId.serviceGroupId && ele.doctorId.serviceGroupId.length && 
          ele.consultantDoctorId[0] && ele.consultantDoctorId[0].serviceGroupId && ele.consultantDoctorId[0].serviceGroupId.length){
            let groupCode = compareServiceGroup(ele.doctorId, ele.consultantDoctorId[0]); 
            if(groupCode) recordsData.groupCode = groupCode;
          }
      }
      if(ele.patientId && ele.patientId.name) recordsData.patientName = ele.patientId.name;
      if(ele.patientPID) recordsData.patientPID = ele.patientPID;
      if(ele.patientId && ele.patientId.personalId) recordsData.patientPID = ele.patientId.personalId;
      if(ele.patientId && ele.patientId.personalId) recordsData.patientPID = ele.patientId.personalId;
      if(ele.consultantDoctorId[0] && ele.consultantDoctorId[0].name) recordsData.doctor2Name = ele.consultantDoctorId[0].name;
      ele.fileUrl.forEach(function(urlEle, index){
        // console.log("[downloadRecordFilesWithZip] urlEle: ", urlEle);
        // console.log("[downloadRecordFilesWithZip] index: ", index);
        recordsData.url = urlEle;
        if(ele.createTime) recordsData.meetingTime = moment(ele.createTime).format('YYYY-MM-DD-HH???mm???ss???') +'-P'+index;
        // console.log("[downloadRecordFilesWithZip] recordsData: ", recordsData);
        meetingDataList.push(JSON.parse(JSON.stringify(recordsData)));
      });
    }
  });
  return meetingDataList
}

function compareServiceGroup(doctorId, cDoctorId){
  let groupCode;
  for (let i = 0; i < doctorId.serviceGroupId.length; i++) {
    for (let j = 0; j < cDoctorId.serviceGroupId.length; j++) {
      console.log("[compareServiceGroup] ele._id: ", doctorId.serviceGroupId[i]._id);
      console.log("[compareServiceGroup]  cEle._id: ",  cDoctorId.serviceGroupId[j]._id);
      if(String(doctorId.serviceGroupId[i]._id) == String(cDoctorId.serviceGroupId[j]._id)){
        //groupCode = doctorId.serviceGroupId[i].displayname + doctorId.serviceGroupId[i].code;
        groupCode = doctorId.serviceGroupId[i].code;
        console.log("[compareServiceGroup]  groupCode: ",  groupCode);
        break;
      }
    }
  }
  return groupCode;
}

function getZipFileName(urlList){
  let time = urlList[0].meetingTime.split(' ')
  return  urlList[0].companyName+'_'+ time[0] +'__'+ (new Date()).getTime();
}



function compareFHIRData(bean, callback) {
  let {input, output} = bean;
  const folderPath = path.join(__dirname, "../public/test/Hplus.txt");
  let text = fs.readFileSync(folderPath, 'utf-8')
  let dataStr = text.toString();
  let ourUsers = require("../public/test/ourP.json").data;
  let sameResult = [];

  ourUsers.map((ele) => {
    let pos = dataStr.indexOf(ele.mobile);
    //console.log("pos: ", pos);
    if(pos>0) {
      
      sameResult.push(ele)
    }
  });
  console.log("sameResult.length: ", sameResult.length);
  const resultFolderPath = path.join(__dirname, "../public/test/sameResult.json");
  fs.writeFileSync(resultFolderPath, JSON.stringify(sameResult), function(){});
  output.result = sameResult;
  return callback && callback(null);
  
}

function createFHIRPatient(bean, callback) {
  let {input, output} = bean;
  let ourUsers = require("../public/test/sameResult_test.json");
  console.log("ourUsers: ", ourUsers);
  ourUsers.map((ele) => {
    if(ele.name && ele.mobile ){
      reqCreateFHIRPatient(ele.name, ele.mobile, ele.birthday, ()=>{});
    }
  });
  return callback && callback(null);
}

function reqCreateFHIRPatient(nameText, telecomValue, birthDate, callback) {
  let body = {
    "resourceType": "Patient",
    "name": {
        "use": "official",
        "text": nameText,
        // "family": "???",
        // "given": "??????"
    },
    // "gender": "male",
    "telecom": {
        "system": "phone",
        "value": telecomValue,
        "use": "mobile"
    },
    "active": true,
  }
  if(birthDate) body.birthDate = birthDate;
  let Options = {
    'url': 'http://113.196.226.67:8090/fhir/Patient?_format=json&_pretty=true',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': 'application/json'
    }
  };
  console.log('[reqCreateFHIRPatient] Options:', Options);
  request.post(Options, function(err, response, results) {
    console.log('[reqCreateFHIRPatient] results:', results);
    if (err) return callback(err, null);
    if (results) return callback({name:'ZoomErr'}, null);   
    callback(null, results);
  });
}

/**
 * Goal. ??????????????????-??????????????????????????????????????????????????????????????????????????????????????????
 * Annotator. Jack Hu
 * Date. 20211207
 * 
 * @param {any} bean -> ???????????????
 * @param {Function} callback 
 * @returns {any} 
 * 
 */
function filterByFileUrl(bean, callback) {
  let { output } = bean;
  
  if(!output.result.recordsList || !output.result.recordsList.length) {
    return callback && callback(null);
  }
  let results = output.result.recordsList;

  let hasNoFileUrlArray = results.filter((el) => {
    return el.fileUrl.length === 0;
  }); 

  let statistics = {
    hasNoFileUrlTotal: hasNoFileUrlArray.length,
    total: results.length, 
  }

  output.result.statistics = statistics;
  output.result.hasNoFileUrl = hasNoFileUrlArray;
  return callback && callback(null);
}

/**
 * Goal. ????????????????????????????????????email???????????????????????????
 * Annotator. Jack Hu
 * Date. 20211207
 * 
 * @param {any} bean -> ????????????
 * @param {String} notificationMsg -> ??????????????????????????????????????????????????????????????? 1.summary 2.abnormal
 * @param {Function} callback 
 * @returns {any}
 * 
 */
function sendAlert_NoFileUrl(bean, notificationMsg, callback) {
  let { input, output } = bean;
  let content = '';
  let subject = '';

  let _r = output.result.hasNoFileUrl;

  if(!ALERT_RECEIVER_EMAIL) {
    logger.info(`[sendAlert_NoFileUrl] No found Parmas - ALERT_RECEIVER_EMAIL: ${ALERT_RECEIVER_EMAIL}`);
    return callback && callback(null);
  }

  if(!notificationMsg || notificationMsg === '') {
    logger.info(`[sendAlert_NoFileUrl] No found Parmas - ALERT_RECEIVER_EMAIL: ${notificationMsg}`);
    return callback && callback(null);
  }

  if(!output.result.recordsList || !output.result.recordsList.length) return callback && callback(null);

  content += `[????????????]: ${moment().format('YYYY-MM-DD-HH???mm???ss???')} \n`;

  switch(notificationMsg) {
    case 'summary':
      content += `[????????????]: ${input.queryStartTime.format('YYYY-MM-DD-HH???mm???ss???')} - ${(moment(input.queryStartTime).add(input.daysRange, 'days')).format('YYYY-MM-DD-HH???mm???ss???')} \n`;
      break;
    case 'abnormal':
      if(_r.length > 0) {  
        content += `[????????????]: ${input.queryStartTime.format('YYYY-MM-DD-HH???mm???ss???')} - ${moment().format('YYYY-MM-DD-HH???mm???ss???')} \n`;
      }
      break;
    default:
      break;
  }
  
  content += `[????????????]: ${output.result.statistics.total} \n`;
  content += `[????????????]: ${output.result.statistics.hasNoFileUrlTotal} \n`;
  content += `[????????????]: \n`;

  if(_r.length > 0) {
    _r.forEach((el) => {
      content += `\n===== ??????????????? ===== \n`;
      content += `[????????????]: ${el.createTime} \n`;
      content += `[??????id]: ${el._id} \n`;
      content += `[??????id]: ${el.doctorId._id} \n`;
      content += `[????????????id]: ${el.consultantDoctorId._id? el.consultantDoctorId._id: ''} \n`;
      content += `[??????????????????]: ${el.isAcceptInviteMeeting} \n`;
    });
  }

  // NOTE: ??????bug???subject????????????????????????????????????????????????[????????????][...]?????????<????????????><...>?????????????????????
  switch(notificationMsg) {
    case 'summary':
      subject += `<????????????><????????????><${target}> - ???????????????`;
      return sendMailAndSetSubject(ALERT_RECEIVER_EMAIL, subject, content, callback);
    case 'abnormal':
      if(_r.length > 0) {
        subject += `<????????????><????????????><${target}> - ???????????????`;
        return sendMailAndSetSubject(ALERT_RECEIVER_EMAIL, subject, content, callback);
      }
      break;
    default:
      console.log(`notificationMsg no matched. pls choose summary or abnormal!`);
  }

  return callback && callback(null);
}