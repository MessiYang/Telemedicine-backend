import request from 'request';
import config from 'nconf';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import logger from '../config/log';
import {dateToNoonNo, noonNoToHHMM, suggestTimeToExpectedStartTime} from '../utils/dateUtil'

const target = config.get('EXECUTE_TARGET');
const {TELE_MIDDLEWARE_HOST} = config.get(target);

export {
  getRegScheduleByRegDate,
  registerRepeat,
  registerFirst,
  cancelRepeatRegister,
}

function getRegScheduleByRegDate(req, bean, callback) {
  let {input, output} = bean;
  if(!checkCompanyCode(input)) return callback && callback({name:'DataNotFound'}); 
  console.log('[getRegScheduleByRegDate] input:',input);
  let companyCode = checkCompanyCode(input); 
  //console.log('[getRegScheduleByRegDate] req.body:', req.body);
  let body = {
    "token": req.body.token,
    "hospital": companyCode
  }
  let Options = {
    'url': TELE_MIDDLEWARE_HOST + 'appointment/getRegScheduleByRegDate',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  console.log('[getRegScheduleByRegDate] Options:', Options);
  request.post(Options, function(err, response, results) {
    if(err) return callback && callback(err);   
    console.log('[getRegScheduleByRegDate] response:', response.statusCode);
    console.log('[getRegScheduleByRegDate] results:', results);
    if(!results || response.statusCode!=200) return callback && callback({name:'DataNotFound'});   
    let JSONResults = JSON.parse(results);  
    if(!JSONResults || !JSONResults.length) return callback && callback({name:'DataNotFound'});   
    //console.log('[getRegScheduleByRegDate] JSONResults:', JSONResults);
    input.MWOutPatientList = JSONResults;
    return callback && callback(null);
  });
}

function registerRepeat(req, bean, callback) {
  let {input, output} = bean;
  if(input.isNoNeedRegisterRepeat) return callback && callback(null);
  //console.log('[registerRepeat] input:',input);
  if(!checkPatientData(input)) return callback && callback({name:'ParamMissForRegister'}); 
  if(!checkCompanyCode(input)) return callback && callback({name:'DataNotFound'}); 
  let companyCode = checkCompanyCode(input); 
  let hospOutPatient = compareOutPatient(companyCode, input.outpatientData, input.MWOutPatientList);
  if(!hospOutPatient) return callback && callback({name:'HospitalNoThisOutpatient'}); 
  //console.log('[registerRepeat] req.body:', req.body);
  let body = {
    "token": req.body.token,
    "institutionCode": companyCode,
    "doctorId" : hospOutPatient.doctorId,
    "deptCode": hospOutPatient.deptCode,
    "userIDValue": input.patientData.personalId,
    "regDateTime":  hospOutPatient.date+" "+noonNoToHHMM(companyCode, hospOutPatient.noonNo),
    "hospital" : companyCode,
    "noonNo" : hospOutPatient.noonNo,
    "room": hospOutPatient.room,
    "telemedicineType" : "1"
  }
  if(input.patientData.birthday) body.birthday = input.patientData.birthday;
  let Options = {
    'url': TELE_MIDDLEWARE_HOST + 'appointment/registerRepeat',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  console.log('[registerRepeat] body:', body);
  request.post(Options, function(err, response, results) {
    if(err) return callback && callback(err);   
    //console.log('[registerRepeat] results:', results);
    if(!results || response.statusCode!=200) return callback && callback({name:'DataNotFound'});   
    let JSONResults = JSON.parse(results);   
    console.log('[registerRepeat] JSONResults:', JSONResults);
    // if(JSONResults.replyNo == '99') return callback && callback({printMsg: JSONResults.message});  
    if(JSONResults.firstReg == 'true' && JSONResults.status == 'done') return callback && callback({name:'NeedFirstRegister'}); 
    if(JSONResults.status != "done") return callback && callback({printMsg: JSONResults.message}); 
    input.registerResult = JSONResults;
    input.outpatientData.hospSuggestTime = suggestTimeToExpectedStartTime(companyCode, hospOutPatient.date, JSONResults.suggestTime);
    return callback && callback(null);
  });
}

function registerFirst(req, bean, callback) {
  let {input, output} = bean;
  //console.log('[registerRepeat] input:',input);
  if(!checkPatientData(input)) return callback && callback({name:'ParamMissForRegister'}); 
  if(!checkCompanyCode(input)) return callback && callback({name:'ParamMissForRegister'}); 
  let companyCode = checkCompanyCode(input); 
  let hospOutPatient = compareOutPatient(companyCode, input.outpatientData, input.MWOutPatientList);
  if(!companyCode) return callback && callback({name:'CompanyNotFound'}); 
  if(!hospOutPatient) return callback && callback({name:'HospitalNoThisOutpatient'}); 
  //console.log('[registerRepeat] req.body:', req.body);
  let body = {
    "token": req.body.token,
    "institutionCode": companyCode,
    "doctorId" : hospOutPatient.doctorId,
    "deptCode": hospOutPatient.deptCode,
    "userIDValue": input.patientData.personalId,
    "tel1": input.patientData.accountId.account,
    "regDateTime":  hospOutPatient.date+" "+noonNoToHHMM(companyCode, hospOutPatient.noonNo),
    "hospital" : companyCode,
    "noonNo" : hospOutPatient.noonNo,
    "room": hospOutPatient.room,
    "telemedicineType" : "1"
  }
  if(input.patientData.birthday) body.birthday = input.patientData.birthday;
  let Options = {
    'url': TELE_MIDDLEWARE_HOST + 'appointment/registerFirst',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  console.log('[registerFirst] body:', body);
  request.post(Options, function(err, response, results) {
    if(err) return callback && callback(err);   
    console.log('[registerFirst] results:', results);
    if(!results || response.statusCode!=200) return callback && callback({name:'DataNotFound'});   
    let JSONResults = JSON.parse(results);   
    console.log('[registerFirst] JSONResults:', JSONResults);
    //if(JSONResults.replyNo == '99') return callback && callback({name:'RepeatAppointment'});  
    if(JSONResults.status == "done") {
      input.isNoNeedRegisterRepeat = true;
      input.registerResult = JSONResults;
      input.outpatientData.hospSuggestTime = suggestTimeToExpectedStartTime(companyCode, hospOutPatient.date, JSONResults.suggestTime);
      return callback && callback(null);
    }else{
      input.isNoNeedRegisterRepeat = false;
      return callback && callback(null);
    }  
  });
}

function cancelRepeatRegister(req, bean, callback) {
  let {input} = bean;
  if(!checkPatientData(input)) return callback && callback({name:'ParamMissForRegister'}); 
  if(!checkCompanyCode(input)) return callback && callback({name:'ParamMissForRegister'}); 
  let companyCode = checkCompanyCode(input); 
  let hospOutPatient = compareOutPatient(companyCode, input.outpatientData, input.MWOutPatientList);
  if(!companyCode) return callback && callback({name:'CompanyNotFound'}); 
  if(!hospOutPatient) return callback && callback({name:'HospitalNoThisOutpatient'}); 
  //console.log('[cancelRepeatRegister] req.body:', req.body);
  let body = {
    "token": req.body.token,
    "institutionCode": companyCode,
    "doctorId" : hospOutPatient.doctorId,
    "deptCode": hospOutPatient.deptCode,
    "userIDValue": input.patientData.personalId,
    "regDateTime":  hospOutPatient.date+" "+noonNoToHHMM(companyCode, hospOutPatient.noonNo),
    "hospital" : companyCode,
    "noonNo" : hospOutPatient.noonNo,
    "room": hospOutPatient.room,
    "userId" : "backend_cancel"
  }
  if(input.patientData.birthday) body.birthday = input.patientData.birthday;
  let Options = {
    'url': TELE_MIDDLEWARE_HOST + 'appointment/cancelRepeatRegister',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  console.log('[cancelRepeatRegister] body:', body);
  request.post(Options, function(err, response, results) {
    if(err) return callback && callback(err);   
    //console.log('[cancelRepeatRegister] results:', results);
    if(!results || response.statusCode!=200) return callback && callback({name:'DataNotFound'});   
    let JSONResults = JSON.parse(results);   
    console.log('[cancelRepeatRegister] JSONResults:', JSONResults);
    if(JSONResults.status != "done") return callback && callback({printMsg: JSONResults.message});   
    input.registerResult = JSONResults;
    return callback && callback(null);
  });
}

function compareOutPatient(companyCode, ourData, hospData){
  let result;
  let noonNo = dateToNoonNo(companyCode, ourData.startTime);
  let hospital = companyCode;
  let deptCode = ourData.doctorId.departmentCode;
  let date = moment(ourData.startTime).utc().add(8, 'hours').format("YYYY-MM-DD");
  let room;
  if(ourData.roomCode){
    room = ourData.roomCode;
    result = hospData.find(isTheSameOutPatientByRoom);
  }else{
    result = hospData.find(isTheSameOutPatient);
  }
  console.log('[compareOutPatient] noonNo:', noonNo);
  console.log('[compareOutPatient] hospital:', hospital);
  console.log('[compareOutPatient] deptCode:', deptCode);
  console.log('[compareOutPatient] date:', date);
  console.log('[compareOutPatient] room:', room);
  function isTheSameOutPatient(OutPatient) {
    return OutPatient.date == date && OutPatient.deptCode == deptCode && OutPatient.hospital == hospital && OutPatient.noonNo == noonNo;
  }
  function isTheSameOutPatientByRoom(OutPatient) {
    return OutPatient.date == date && OutPatient.deptCode == deptCode && OutPatient.hospital == hospital && OutPatient.noonNo == noonNo && OutPatient.room == room;
  }
  console.log('[compareOutPatient] result:',result);
  return result;
}

function checkCompanyCode(input){
  if (!input||!input.outpatientData||!input.outpatientData.doctorId||!input.outpatientData.doctorId.companyId||!input.outpatientData.doctorId.companyId.code){
    return null;
  }else{
    return input.outpatientData.doctorId.companyId.code.toUpperCase();
  }
}

function checkPatientData(input){
  if (!input||!input.patientData||!input.patientData.personalId||!input.patientData.birthday){
    return null;
  }else{
    return true;
  }
}