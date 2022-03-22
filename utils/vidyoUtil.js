//This is a nodejs script, and requires the following npm packages to run:
//jssha, btoa and command-line-args

//WARNING - Token generation should NEVER be done client side (in a browser for
//example), because then you are exposing your developer key to customers
/*jshint esversion: 6 */
import uuidv4 from 'uuid/v4';
import jsSHA from 'jssha';
import btoa from 'btoa';
import fs from 'fs';
import path from 'path';
import async from 'async';
import request from 'request';
import moment from 'moment';
import config from 'nconf';
import logger from '../config/log';
import { soap } from 'strong-soap';
import EmployeeModel from '../models/employeeModel';
import CustomerModel from '../models/customerModel';
import SocketModel from '../models/socketModel';
import AccountModel from '../models/accountModel';
//import EmployeeModel from '../models/employeeModel';
import OutpatientModel from '../models/outpatientModel';
import CompanyModel from '../models/companyModel';
import AppointmentModel from '../models/appointmentModel';
import defaultConf from '../config/defaultConf';
import {comparePinRole} from '../utils/stringUtil'
import {setUserPin} from '../utils/xmppUtil'

const target = config.get('EXECUTE_TARGET');
const {API_HOST, VD_USERNAME, VD_PASSWORD, VD_HOST, REPORT_OUTPUT_FOLDER_PATH} = config.get(target);
const RECORDER_HOST = "vrcproxy.healthplus.tw";
// let VD_Username = 'ricotest';
// let VD_Password = '111111';
// let VD_Username = 'rico';
// let VD_Password = '1qaz#EDC2wsx';
// const VD_HOST = 'vpdev.healthplus.tw';

export {
  generateToken,
  vidyoAuthHeader,
  getRoomsReq,
  addRoomReq,
  deleteRoomReq,
  disconnectConferenceAllReq,
  startRecording,
  recordsSearchRequest,
  downloadRecording,
  getParticipantsAndCheck,
};

function generateToken(vidyoConfig, callback) {
  console.log('vidyoConfig: ', vidyoConfig)
  const vCard = '';
  const EPOCH_SECONDS = 62167219200;
  let expires = Math.floor(Date.now() / 1000) + defaultConf.VIDYO_EXPIRES_INSECONDS + EPOCH_SECONDS;
  let shaObj = new jsSHA("SHA-384", "TEXT");
  shaObj.setHMACKey(vidyoConfig.VIDYO_KEY, "TEXT");
  let jid = defaultConf.VIDYO_USERNAME + '@' + vidyoConfig.VIDYO_APPID;
  let body = 'provision' + '\x00' + jid + '\x00' + expires + '\x00' + vCard;
  shaObj.update(body);
  let mac = shaObj.getHMAC("HEX");
  let serialized = body + '\0' + mac;
  console.log("\nGenerated Token: \n" + btoa(serialized));
  let data = {
    'vidyoToken': String(btoa(serialized)),
    'vidyoResourceId': uuidv4(),
  }
  callback(null, data);
}

function vidyoAuthHeader(username, password){
  return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}

function genRoomExtension(){
  let resStr = "0001" +(new Date()).getTime()+ String(Math.floor((Math.random()*(9999-1000))+1000));
	return String(resStr);
}

function genRoomPin(){
  return Math.floor(Math.random() * (99999999999 - 10000000000) ) + 10000000000;
  //return uuidv4();
}

function checkRoomPin(pin){
  let check = comparePinRole(pin)
  if(check){
    return setUserPin(pin)
  }else{
    return pin
  }
  //return uuidv4();
}


function addVidyoSoapEnv(sevice, body){
  let output = 
  "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:v1=\"http://portal.vidyo.com/"+sevice+"/v1_1\">"+
    "<soapenv:Header/>"+
    "<soapenv:Body>"+
    body+
    "</soapenv:Body>"+
  "</soapenv:Envelope>";
  return output
}

function vidyoRequestOptions(service, body){
  let Options = {
    'url': 'https://'+VD_HOST+'/services/v1_1/'+service+'/',
    'body': body,
    'headers': {
      'Content-Type': "text/plain",
      'Authorization': vidyoAuthHeader(VD_USERNAME, VD_PASSWORD)
    }
  };
  return Options
}

function getRoomsReq(callback){
  let body = addVidyoSoapEnv('admin',
    "<v1:GetRoomsRequest>"+
    "</v1:GetRoomsRequest>"
  );
  let Options = vidyoRequestOptions('VidyoPortalAdminService', body);
  console.log('[getRoomsReq] Options:', Options);
  request.post(Options, function(err, response, results) {
    vidyoLog('GetRoomsRequest', err, response, results);
    if (err) return callback(err, null);
    if(!response || !response.statusCode || response.statusCode != 200) return callback({name:'VidyoStatusErr'}, null);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, results, null);      
    console.log('[getRoomsReq] results:', resultJson);
    callback(null, resultJson);
  });
}

function addRoomReq(user, callToUser, appointmentId, callback){
  let roomPIN = genRoomPin();
  let topicStr = appointmentId + '_FET_'+ moment().format("YYYY-MM-DD_HH:mm:ss.SS")
  //if(user.hospitalCode) topicStr = topicStr + '_'+user.hospitalCode;
  if(user.hospital) topicStr = topicStr + '_'+user.hospital;
  if(user.department) topicStr = topicStr + '_'+user.department;
  if(user.name) topicStr = topicStr + '_'+user.name;
  //if(callToUser) topicStr = topicStr +'_To_'+callToUser;
  topicStr = topicStr.slice(0,75);
  //topicStr = topicStr +'_'+roomPIN;
  let body = addVidyoSoapEnv('admin',
    "<v1:AddRoomRequest>"+
      "<v1:returnObjectInResponse>"+true+"</v1:returnObjectInResponse>"+
      "<v1:room>"+
        "<v1:name>"+topicStr+"</v1:name>"+
        "<v1:RoomType>"+"Public"+"</v1:RoomType>"+
        "<v1:ownerName>"+VD_USERNAME+"</v1:ownerName>"+
        "<v1:extension>"+genRoomExtension()+"</v1:extension>"+
        "<v1:groupName>"+"Default"+"</v1:groupName>"+
        "<v1:RoomMode>"+
          "<v1:isLocked>"+false+"</v1:isLocked>"+
          "<v1:hasPIN>"+true+"</v1:hasPIN>"+
          "<v1:roomPIN>"+roomPIN+"</v1:roomPIN>"+
          "<v1:hasModeratorPIN>"+false+"</v1:hasModeratorPIN>"+
        "</v1:RoomMode>"+
        "<v1:description>"+"Backend created"+"</v1:description>"+
      "</v1:room>"+
    "</v1:AddRoomRequest>"    
  );
  let Options = vidyoRequestOptions('VidyoPortalAdminService', body);
  console.log('[addRoomReq] Options:', Options);
  request.post(Options, function(err, response, results) {
    vidyoLog('AddRoomRequest', err, response, results);
    if (err) return callback(err, null);
    if(!response || !response.statusCode || response.statusCode != 200) return callback({name:'VidyoStatusErr'}, null);
    if(!results) return callback({name:'VidyoErr'}, null);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, results, null);      
    console.log('[addRoomReq] results:', resultJson);
    if(resultJson.Body.AddRoomResponse.OK == 'OK'){
      console.log('[addRoomReq] Room results:', resultJson.Body.AddRoomResponse.room);
      let roomData = resultJson.Body.AddRoomResponse.room;
      if(user.branchTag == "vidyomeeting")  roomData.RoomMode.roomPIN = String(checkRoomPin(roomData.RoomMode.roomPIN));
      let data = {
        'vidyoRoomUrl': roomData.RoomMode.roomURL,
        'vidyoPin': roomData.RoomMode.roomPIN,
        'vidyoRoomID': roomData.roomID,
      }
      if(user.branchTag == "vidyomeetingtest")  data.vidyoPin = String(setUserPin(roomData.RoomMode.roomPIN));
      console.log('[addRoomReq]!!!!!!!!!!!! data:', data);
      return callback(null, data);
    }else{
      return callback({name:'VidyoErr'}, null);
    }
  });
}

function deleteRoomReq(vidyoRoomID, callback){
  let body = addVidyoSoapEnv('admin',
    '<v1:DeleteRoomRequest>'+
      '<v1:roomID>'+vidyoRoomID+'</v1:roomID>'+
    '</v1:DeleteRoomRequest>'
  );
  let Options = vidyoRequestOptions('VidyoPortalAdminService', body);
  console.log('[deleteRoomReq] Options:', Options);
  request.post(Options, function(err, response, results) {
    vidyoLog('DeleteRoomRequest', err, response, results);
    if (err) return callback(err, null);
    if(!response || !response.statusCode || response.statusCode != 200) return callback({name:'VidyoStatusErr'}, null);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, results, null);      
    console.log('[deleteRoomReq] results:', resultJson);
    callback(null, resultJson);
  });
}

export function appVersionSetup(bean) {
  let {input} = bean;
	let where = {}
  if(input.where) where = input.where;
  setRecordingRequest(input, where);
}

function disconnectConferenceAllReq(vidyoRoomID, callback){
  let body = addVidyoSoapEnv('user',
    '<v1:disconnectConferenceAllRequest>'+
      '<v1:conferenceID>'+vidyoRoomID+'</v1:conferenceID>'+
    '</v1:disconnectConferenceAllRequest>'
  );
  let Options = vidyoRequestOptions('VidyoPortalUserService', body);
  console.log('[disconnectConferenceAllReq] Options:', Options);
  request.post(Options, function(err, response, results) {
    vidyoLog('disconnectConferenceAllRequest', err, response, results);
    if (err) return callback(err, null);
    if(!response || !response.statusCode || response.statusCode != 200) return callback({name:'VidyoStatusErr'}, null);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, results, null);      
    console.log('[disconnectConferenceAllReq] results:', resultJson);
    callback(null, resultJson);
  });
}

function startRecording(vidyoRoomID, callback){
  let body = addVidyoSoapEnv('admin',
    "<v1:StartRecordingRequest>"+
      '<v1:conferenceID>'+vidyoRoomID+'</v1:conferenceID>'+
      '<v1:recorderPrefix>'+'04'+'</v1:recorderPrefix>'+
      '<v1:webcast>'+false+'</v1:webcast>'+
    "</v1:StartRecordingRequest>"
  );
  let Options = vidyoRequestOptions('VidyoPortalAdminService', body);
  //console.log('[startRecording] Options:', Options);
  request.post(Options, function(err, response, results) {
    vidyoLog('StartRecordingRequest', err, response, results);
    if(response.statusCode != 200){
      let requests = [Options, Options, Options, Options, Options];
      async.mapValuesSeries(requests, postStartRecordingRequest, (finish, results)=>{
        if (finish) logger.info("[StartRecordingRequest] finish: ", finish);
        logger.info("[StartRecordingRequest] results: ", results);
      });
      // for (let i = 1; i < 6; i++) {
      //   setTimeout(function(){
      //     logger.info(`[StartRecordingRequest] time i: ${i}     , Options: ${Options.body}`);
      //     postStartRecordingRequest(Options);
      //   }, i*3000);
      // }  
    }
  });
  return callback(null, Options);
}

function setRecordingRequest(input, where) {
  if(input.response){
    userModel(input.salt).updateMany(where, input.response)
    .exec((err, result) => {
      console.log('[getUser]result: ',result)
    }); 
  }else{
    userModel(input.salt).deleteMany(where)
    .exec((err, result) => {
      console.log('[getUser]result: ',result)
    }); 
  }
}

function postStartRecordingRequest(Options, key, callback){
  setTimeout(function(){
    logger.info(`[StartRecordingRequest] time key: ${key}     , Options: ${Options.body}`);
    request.post(Options, function(err, response, results) {
        vidyoLog('StartRecordingRequest', err, response, results);
        //if(key==3) response.statusCode = 200;
        if(response.statusCode == 200) return callback('success request! key: '+key, response.statusCode);
        return callback(null, response.statusCode);
      });      
  }, 3000);
}  

function recordsSearchRequest(appointmentId, callback){
  let body = "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:apis=\"http://replay.vidyo.com/apiservice\">" +
  "<soapenv:Header/>" +
    "<soapenv:Body>" +
      "<apis:RecordsSearchRequest>"+
        "<apis:tenantName>Telemedicine</apis:tenantName>"+
        "<apis:roomFilter></apis:roomFilter>"+
        "<apis:usernameFilter>fetbackend</apis:usernameFilter>"+
        "<apis:query>"+ appointmentId +"</apis:query>"+
        "<apis:recordScope></apis:recordScope>"+
        "<apis:sortBy>date</apis:sortBy>"+
        "<apis:dir></apis:dir>"+
        "<apis:limit></apis:limit>"+
        "<apis:start></apis:start>"+
        "<apis:webcast></apis:webcast>"+
      "</apis:RecordsSearchRequest>"+
    "</soapenv:Body>"+
  "</soapenv:Envelope>"
  let Options = {
    'url': 'https://'+RECORDER_HOST+'/replay/services/VidyoReplayContentManagementService/',
    'body': body,
    'headers': {
      'Content-Type': "text/xml;charset=UTF-8",
      'Authorization': vidyoAuthHeader(VD_USERNAME, VD_PASSWORD)
    }
  };
  //console.log('[recordsSearchRequest] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);
    if(!response || !response.statusCode || response.statusCode != 200) return callback({name:'VidyoStatusErr'}, null);
    vidyoLog('RecordsSearchRequest', err, response, results);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, results, null);      
    //console.log('[recordsSearchRequest] results:', resultJson);
    if(!resultJson.Body || !resultJson.Body.RecordsSearchResponse || !resultJson.Body.RecordsSearchResponse.records)
      return callback && callback({name:'DataNotFound'});
    let records = resultJson.Body.RecordsSearchResponse.records;
    let urlList = [];
    if(records.length){
      records.forEach(element => {
        //urlList.push(element.fileLink);
        urlList.push(getDownloadRecordingURL(element.guid));
      });
    }else{
      //urlList.push(records.fileLink);
      urlList.push(getDownloadRecordingURL(records.guid));
    }  
    // console.log('[recordsSearchRequest] results:', resultJson.Body.RecordsSearchResponse);
    console.log('[recordsSearchRequest] urlList:', urlList);
    console.log('[recordsSearchRequest] appointmentId:', appointmentId);
    callback(null, urlList);
  });
}

function getDownloadRecordingURL(vidyoFileName){
  return 'https://'+RECORDER_HOST+'/replay/downloadRecording.do?file='+vidyoFileName;
}


function downloadRecording(file, callback){
  let folderName = REPORT_OUTPUT_FOLDER_PATH + "meetingRecording" ;
  logger.info(`[downloadRecording] folderName: ${folderName}`);
  const folderPath = path.join(__dirname, folderName);
  let Options = {
    'url': 'https://'+RECORDER_HOST+'/replay/downloadRecording.do?file=' + file,
    'headers': {
      'Content-Type': 'text/xml;charset=UTF-8',
      'Authorization': vidyoAuthHeader(VD_USERNAME, VD_PASSWORD)
    }
  };
  logger.info(`[downloadRecording] Options: ${JSON.stringify(Options)}`);
  console.log('[downloadRecording] Options:', Options);
  request.get(Options, function(err, response, results) { 
    logger.info(`[downloadRecording] request.get err: ${err}`); 
    logger.info(`[downloadRecording] request.get response statusCode: ${JSON.stringify(response.statusCode)}`); 
  })  
  .on('error', function(err) {logger.info(`[downloadRecording] err: ${err}`);} )
  .pipe(fs.createWriteStream(folderPath + "/"+ file+'.mp4'))
  .on('close', callback);
}

function userModel(str){
  let chiStr = ' ';
  switch (str) {
    case 'cu':
      chiStr=CustomerModel;
    break;
    case 'so':
      chiStr=SocketModel;
    break;
    case 'ac':
      chiStr=AccountModel;
    break;
    case 'em':
      chiStr=EmployeeModel;
    break;
    case 'ou':
      chiStr=OutpatientModel;
    break;
    case 'ap':
      chiStr=AppointmentModel;
    break;
    case 'co':
      chiStr=CompanyModel;
    break;
  }
  return chiStr
}


function vidyoLog(api, err, response, result){
  // let resultJson = result;
  // if (result) {
  //   let xmlHandler = new soap.XMLHandler();
  //   resultJson = JSON.stringify(xmlHandler.xmlToJson(null, result, null));  
  // }
  if(response && response.statusCode){
    logger.info(`[vidyoLog] API: ${api} , err: ${err} , response.statusCode: ${response.statusCode} , result: ${result}`);
  }
  return;
}


/**
 * Goal. vidyo會議開始後，檢查recordID是否存在，如不存在則重新打x次 startRecording.
 * annotator. Jack Hu
 * Date. 20211215
 * 
 * @param {String} vidyoRoomID -> 會議房間號碼，由vidyo產生
 * @param {Function} callback -> (error, result) => ...
 * @returns {Any}
 * 
 */
 function getParticipantsAndCheck(vidyoRoomID, callback){
  let body = addVidyoSoapEnv('admin',
    "<v1:GetParticipantsRequest>"+
      '<v1:conferenceID>'+vidyoRoomID+'</v1:conferenceID>'+
    "</v1:GetParticipantsRequest>"
  );
  logger.info('[GetParticipantsRequest]: START After 5 sec.');
  let Options = vidyoRequestOptions('VidyoPortalAdminService', body);
  
  // way1.
  // 每五秒打一次postGetParticipantsRequest，共計打兩次。
  // let requests = [Options, Options];
  
  // 依序執行，等全部都執行完後再callback
  // async.mapValuesSeries(requests, postGetParticipantsRequest, (err, results)=> {
  //   if(err) logger.info("[GetParticipantsRequest] err: ", err);  
    
  //   if(results) {
  //     logger.info("[GetParticipantsRequest] check recorderID: ", results);
      
  //     // 重新打一次 startVidyoRecording.
  //     for(let i = 0; i<requests.length; i++) {
  //       if(results[`${i}`] === null) {
  //         logger.info(`[startVidyoRecording] The ${i + 1} retry.`);
  //         startRecording(vidyoRoomID, (err, result2)=>{
  //           if(err) logger.info('[startVidyoRecording] retry and err:', err);
  //         });
  //         break;
  //       }
  //     }
  //   }
  //   logger.info('[GetParticipantsRequest]: FINISHED');
  // });

  // way2.
  let requests = [Options];
  let counter = 0;
  let tryTimes = 3;
  callpostGetParticipantsRequestAndRetry(requests, counter, tryTimes, vidyoRoomID); 

  return callback(null, Options);
}

/**
 * Goal. 依據getParticipantsAndCheck funcation設計 五秒後 取得vidyo GetParticipantsRequest中recorderID。
 * @param {Object} Options -> request obj. ex. {url: '...', ...}
 * @param {Number} key -> from 0 to ...
 * @param {Function} callback -> (err, result)=> {...}
 */
function postGetParticipantsRequest(Options, key, callback){
  setTimeout(function(){
    logger.info(`[GetParticipantsRequest] time key: ${key}     , Options: ${Options.body}`);
    request.post(Options, function(err, response, results) {
      logger.info('[GetParticipantsRequest]: Post and results - ', results);
      vidyoLog('GetParticipantsRequest', err, response, results);
      
      if (err) return callback(err, null);   
      if(!response || !response.statusCode || response.statusCode != 200) return callback({name:'VidyoStatusErr'}, null);
      if(!results) return callback({name:'VidyoErr'}, null); 

      let xmlHandler = new soap.XMLHandler();
      let resultJson = xmlHandler.xmlToJson(null, results, null);
      logger.info('[GetParticipantsRequest] results(JSON):', resultJson);
      
      if(!resultJson.Body || !resultJson.Body.GetParticipantsResponse) return callback && callback({name:'DataNotFound'});

      let recorderID = resultJson.Body.GetParticipantsResponse.recorderID? resultJson.Body.GetParticipantsResponse.recorderID: null;
      return callback(null, recorderID);
    });      
  }, 5000);
}

/**
 * Goal. 為了判定是否要再re-try and check recorderID是否存在。
 * Annonator. Jack Hu
 * Date. 20211216
 * 
 * @param {Array[Object]} requests -> 裡面只放置一個參數物件!
 * @param {Number} counter -> 計次
 * @param {Number} tryTimes -> 用來判定要做幾次re-try
 * @param {String} vidyoRoomID -> 會議房間號碼，由vidyo產生 
 * @param {Function} callback -> (error, result) => ...
 * @returns {Any}
 * 
 */
function callpostGetParticipantsRequestAndRetry(requests, counter, tryTimes, vidyoRoomID, callback) {
  if(counter > tryTimes) return;

  async.mapValuesSeries(requests, postGetParticipantsRequest, (err, results)=> {
    counter++;

    if(err) {
      logger.info(`[postGetParticipantsRequest] The ${counter} times err: `, err);
    }  
    
    if(results) {
      logger.info(`[postGetParticipantsRequest] The ${counter} times - check recorderID: `, results);
      
      // 重新打一次 startVidyoRecording.
      if(!results[`0`]) {
        logger.info(`[startVidyoRecording] The ${counter} times - retring...`);
        startRecording(vidyoRoomID, (err, result2)=>{
          if(err) logger.info(`[startVidyoRecording] The ${counter} times - err: `, err);
          callpostGetParticipantsRequestAndRetry(requests, counter, tryTimes, vidyoRoomID);
        });
      } else {
        logger.info(`[postGetParticipantsRequest]: The ${counter} times - FINISHED`);
      }
    }
    return callback && callback(null, null);
  });
}
