import crypto from 'crypto';
import moment from 'moment';
import escapeRegExp from 'escape-string-regexp';
import jwt from 'jsonwebtoken';
import uuidv4 from 'uuid/v4';
import config from 'nconf';
import fs from 'fs';
//import socketIOUtil from '../utils/socketIOUtil';
import {apnSend, voipSend} from '../utils/apnUtil';
import {fcmSend} from '../utils/fcmUtil';
import defaultConf from '../config/defaultConf';
import {getAllUserOnlineStatus} from '../utils/xmppUtil';
//import {setRomReq} from '../utils/vidyoUtil';
//import {transformTo256} from '../services/userService';
import CustomerModel from '../models/customerModel';

const CIPHER_KEY = crypto.scryptSync(defaultConf.CIPHER_PASSWORD, 'salt', 24);
const CIPHER_KEY_256 = crypto.scryptSync(defaultConf.CIPHER_PASSWORD, 'salt', 32);
const IV_LENGTH = 16;

export {
  uuidv4,
  encrypt,
  //decrypt,
  decryptString,
  decryptStringToTransform,
  sortRecordResult,
  inputOutpatientIdPatientId,
};

export function isJSON(data){
  try {
    JSON.parse(data); 
  } catch (error) {
    //console.log('[checkJson] isJSON!!!: false');
    return false
  }
  return true
}

export function hideDataString(str){
  let star = "*";
  if (str.length <= 10){
    return str.replace(str.substr(str.length/3,str.length/2), star.repeat(str.length/2));
  }else{
    return str.replace(str.substr(3,str.length-6), star.repeat(str.length-6));
  }
}

export function failResponseForm(e){
  let response = {
    success: false,
    data: null,
    errors: e[0],
    code: e[1],
    message:{
      'en-US':e[2],
      'zh-TW':e[3]
    }
  };
  return response;
}

export function guid(prefix) {
  let uuid = ((prefix||'')+'xxxxxxx-xxxx-wxxx-yxxx-xxxxxxxxxxxx').replace(/[xyw]/g, (c) => {
    let r = Math.floor((1 + Math.random()) * 0x10000 % 16).toString(16);
    return (c=='x' ? r : (c=='y' ? (r&0x3|0x8) : (r&0x3|0x1))).toString(16);
  });
  return uuid;
}

export function isPersonalId(id) {
  //建立字母分數陣列(A~Z)
  let city = new Array(
    1,10,19,28,37,46,55,64,39,73,82, 2,11,
    20,48,29,38,47,56,65,74,83,21,3,12,30
    )
  // 使用「正規表達式」檢驗格式
  if (id.search(/^[A-Z](1|2)\d{8}$/i) == -1) {
    return false;
  } else {
    //將字串分割為陣列(IE必需這麼做才不會出錯)
    id = id.split('');
    //計算總分
    let total = city[id[0].charCodeAt(0)-65];
    for(let i=1; i<=8; i++){
      total += eval(id[i]) * (9 - i);
    }
    total += eval(id[9]);
    //檢查比對碼(餘數應為0);
    return ((total%10 == 0 ));
  }
}

export function isForeignIdNumber(id) {
  //驗證填入身分證字號長度及格式
  if(id.length != 10){
    return false;
  }
  //格式，用正則表示式比對第一個字母是否為英文字母
  if(isNaN(id.substr(2,8)) ||
  (!/^[A-Z]$/.test(id.substr(0,1))) || (!/^[A-Z]$/.test(id.substr(1,1)))){
  return false;
  }
  let idHeader = "ABCDEFGHJKLMNPQRSTUVXYWZIO"; //按照轉換後權數的大小進行排序
  //這邊把身分證字號轉換成準備要對應的
  id = (idHeader.indexOf(id.substring(0,1))+10) +
  '' + ((idHeader.indexOf(id.substr(1,1))+10) % 10) + '' + id.substr(2,8);
  //開始進行身分證數字的相乘與累加，依照順序乘上1987654321
  let snumber = parseInt(id.substr(0,1)) +
  parseInt(id.substr(1,1)) * 9 +
  parseInt(id.substr(2,1)) * 8 +
  parseInt(id.substr(3,1)) * 7 +
  parseInt(id.substr(4,1)) * 6 +
  parseInt(id.substr(5,1)) * 5 +
  parseInt(id.substr(6,1)) * 4 +
  parseInt(id.substr(7,1)) * 3 +
  parseInt(id.substr(8,1)) * 2 +
  parseInt(id.substr(9,1));
  let checkNum = parseInt(id.substr(10,1));
  //模數 - 總和/模數(10)之餘數若等於第九碼的檢查碼，則驗證成功
  console.log(10 - snumber % 10);
  if((10 - snumber % 10) == checkNum){
  return true;
  }
  else{
  return false;
  }
}

export function hashString(plain, salt) {
  let key = crypto.pbkdf2Sync(plain, salt, 1, 28, 'sha1');
  return key.toString('hex');
}

export function hashPassword(password, salt, account, force=false) {
  if (force && account) {
    password = hashString(password, account);
  }
  password = hashString(password, salt);
  return password.toString('hex');
}

export function makeRegExp(pattern, attributes='i') {
  return new RegExp(escapeRegExp(pattern), attributes);
}

//http://travistidwell.com/blog/2013/09/06/an-online-rsa-public-and-private-key-generator/
export function tokenSign(data, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_token`;
	let expired = config.get('TOKEN_EXPIRED');
	let cert = config.get('TOKEN_PRIVATE_CERT');
	let privateCert = fs.readFileSync(cert);
	jwt.sign(data, privateCert, {expiresIn : expired, algorithm: 'RS512', issuer: issuer}, (err, token) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, token);
		}
	});
}

export function tokenVerify(token, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_token`;
	let cert = config.get('TOKEN_PUBLIC_CERT');
	let publicCert = fs.readFileSync(cert);
	jwt.verify(token, publicCert, {issuer: issuer}, (err, data) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, data);
		}
	});
}

export function refreshTokenSign(data, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_retoken`;
	let expired = config.get('REFRESH_TOKEN_EXPIRED');
	let cert = config.get('TOKEN_PRIVATE_CERT');
	let privateCert = fs.readFileSync(cert);
	jwt.sign(data, privateCert, {expiresIn : expired, algorithm: 'RS512', issuer: issuer}, (err, token) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, token);
		}
	});
}

export function refreshTokenVerify(retoken, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_retoken`;
	let cert = config.get('TOKEN_PUBLIC_CERT');
	let publicCert = fs.readFileSync(cert);
	jwt.verify(retoken, publicCert, {issuer: issuer}, (err, data) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, data.accountId);
		}
	});
}

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY_256, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function encrypt192(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-192-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt192(text) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-192-cbc', CIPHER_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function decrypt256(text) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY_256, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function decryptString(input){
  let output = input;
  if(input && input.includes(":") && input.length>=60){
    try{
      output = decrypt256(input);
    }catch(e){
      console.log('[decryptString] is not 256!!');
      try{
        output = decrypt192(input);
      }catch(e){
        console.log('[decryptString] bad decrypt!! e: ', e);
        output = "bad decrypt";
      }
    }
    console.log('[decryptString] decrypt:', output);
  }
  return output;
}

function decryptStringToTransform(input){
  let output = input;
  let isNot256 = false ;
  if(input && input.includes(":") && input.length>=60){
    try{
      output = decrypt256(input);
    }catch(e){
      console.log('[decryptString] is not 256!!');
      try{
        output = decrypt192(input);
        isNot256 = true;
      }catch(e){
        console.log('[decryptString] bad decrypt!! e: ', e);
        output = "bad decrypt";
      }
    }
    if(isNot256) transformTo256(input, output);
    console.log('[decryptString] decrypt:', output);
  }
  return output;
}

function transformTo256(input192, decryptData){
  const encryptData = encrypt(decryptData);
  let where = {
    'name': input192,
  }
  let updateData =  {
    'name': encryptData,
  }
  CustomerModel.update(where, {$set: updateData}, (err, result1)=>{
    if (err) return console.log('[transformTo256] err:', err);
    console.log('[transformTo256] result1:', result1);
    if (result1.nModified) return console.log('[transformTo256] name transform to 256');
    let where = {
      'personalId': input192,
    }
    let updateData =  {
      'personalId': encryptData,
    }
    CustomerModel.update(where, {$set: updateData}, (err, result2)=>{
      if (err) return console.log('[transformTo256] err:', err);
      console.log('[transformTo256] result2:', result2);
      if (result2.nModified) return console.log('[transformTo256] personalId transform to 256');
      return console.log('[transformTo256] No data transform to 256');
    });
  });
}

export function generateOutTradeId(code) {
	let outTradeId;
  if(code) {
		outTradeId = code.slice(0, 3).toUpperCase();
  }else{
		outTradeId = 'COM';
  }
  outTradeId =  outTradeId.concat(moment().format("YYYYMMDDHHmmssSS"));
  //console.log('outTradeId: ', outTradeId);
  let r = Math.floor((Math.random() * 10000) + 1);
  //console.log('r: ', r);
  return outTradeId.concat(r);
}

export function addUserOnlineStatus(userIdList, idField, cb){
  userIdList = JSON.parse(JSON.stringify(userIdList));
  console.log('!!!!userIdList: ', userIdList);
  getAllUserOnlineStatus((err, onlineList)=>{
  //socketIOUtil.getOnlineUserKeys((err, onlineList)=>{
    if(err) return cb(err, null);
    if(idField){
      userIdList.forEach((element,index) => {
        if (element[idField] && onlineList.includes(element[idField]._id) && 
        element[idField].isReceiveNotification == true && element[idField].isInMeeting == false){
          userIdList[index].isOnline = true;
        }else{
          userIdList[index].isOnline = false;
        }
        if(element[idField]&&element[idField].isConnectNote && element[idField].isConnectNote == '0') userIdList[index].isOnline = false;
      });
    }else{
      userIdList.forEach((element,index) => {
        if (onlineList.includes(element._id) && element.isReceiveNotification == true &&
        element.isInMeeting == false){
          userIdList[index].isOnline = true;
        }else{
          userIdList[index].isOnline = false;
        }
        if(element.isConnectNote && element.isConnectNote == '0') userIdList[index].isOnline = false;
      });    
    }
    return cb(null, userIdList);
  });
}

export function getCallUserMsg(outpatient){
  let msg;
  if(outpatient.doctorId&&outpatient.doctorId.companyId) msg = outpatient.doctorId.companyId.displayname + ' ';
  if(outpatient.department) msg = msg + outpatient.department+ ' ';
  if(outpatient.startTime){
    msg = msg + dateToNoonStr(outpatient.startTime) +'診';
  }
  return msg;
}

export function noteUserToOnlineMsg(launchUser, invitedUser){
  let msg = `${decryptString(invitedUser)}: 請進入遠距醫療App  ${decryptString(launchUser)}傳送` 
  return msg;
}

export function noteOutpatientTimeMsg(patient , outpatient){
  let weekDay = moment(outpatient.startTime).format("e");
  //let pmOrAm = moment(outpatient.startTime).format("a");
  let msg = decryptString(patient.name) + '您好, 提醒: ' + moment(outpatient.startTime).format("MM月DD日")+
  '星期'+weekOfDayToChinese(weekDay)+moment(outpatient.startTime).format(" HH點mm分")+
  dateToNoonStr(outpatient.startTime)+'診 '+outpatient.department + outpatient.doctorId.name + '醫師 ' + 
  outpatient.doctorId.companyId.displayname;
  return msg;
}
export function noteFirstPatientReadyMsg(patient , outpatient){
  let msg = decryptString(patient.name) + '您好, 提醒: ' + moment(outpatient.startTime).format("今天HH點mm分, ")+
  outpatient.department + outpatient.doctorId.name + '醫師診 即將開始' 
  return msg;
}
export function noteFirstDoctorReadyMsg(outpatient){
  let msg = outpatient.doctorId.name + '您好, 提醒: ' + moment(outpatient.startTime).format("今天HH點mm分, ")+
  outpatient.department + '門診 即將開始' 
  return msg;
}

export function noteNextPatientMsg(nextNumber, patient, outpatient){
  let msg = decryptString(patient.name) + '您好, 提醒: ' + moment(outpatient.startTime).format("今天HH點mm分, ")+
  outpatient.department + outpatient.doctorId.name + '醫師診 再'+nextNumber+'位看診後將開始 請準備' 
  return msg;
}

export function noteDoctorCommunicateReadyMsg(appointment){
  let msg = appointment.doctorId.name + '您好, 提醒: ' + moment(appointment.expectedStartTime).format("今天HH點mm分, ")+
  appointment.doctorId.department + '醫病溝通 即將開始' 
  return msg;
}

export function noteFamilyCommunicateReadyMsg(patient , appointment){
  let msg = decryptString(patient.name) + '您好, 提醒: ' + moment(appointment.expectedStartTime).format("今天HH點mm分, ")+
  appointment.doctorId.department + appointment.doctorId.name + '醫師 病情溝通 即將開始' 
  return msg;
}

export function pmOrAmToChinese(str){
  let chiStr = '門';
  switch (str) {
    case 'am':
      chiStr="上午";
    break;
    case 'pm':
      chiStr="下午";
    break;
  }
  return chiStr
}

function dateToNoonStr(date){
  let result = '門';
  let taiwanTimeHour = moment(date).utc().add(8, 'hours').hours()   //0~23
  console.log("[dateToNoonStr] taiwanTimeHour:", taiwanTimeHour);
  if(taiwanTimeHour>=5 && taiwanTimeHour<12){
    result = "上午";
  }else if(taiwanTimeHour>=12 && taiwanTimeHour<17){
    result = "下午";
  }else{
    result = "夜";
  }
  return result
}

function weekOfDayToChinese(str){
  let chiStr = ' ';
  switch (str) {
    case '0':
      chiStr="天";
    break;
    case '1':
      chiStr="一";
    break;
    case '2':
      chiStr="二";
    break;
    case '3':
      chiStr="三";
    break;
    case '4':
      chiStr="四";
    break;
    case '5':
      chiStr="五";
    break;
    case '6':
      chiStr="六";
    break;
  }
  return chiStr
}

export function pushMessage(isDebug, apnTokens, fcmTokens, title, payload, msgData, role){
  if (apnTokens && apnTokens.length > 0){
    apnSend(isDebug, apnTokens, title, payload, msgData, role, ()=>{});
  }
  if (fcmTokens && fcmTokens.length > 0){
    fcmSend(null, fcmTokens, title, payload, msgData, ()=>{});
  }
}

export function callUser(isDebug, voipTokens, fcmTokens, title, payload, msgData){
  console.log('callUser: payload', payload);
  console.log('callUser: msgData', msgData);
  if (voipTokens && voipTokens.length > 0){
    voipSend(isDebug, voipTokens, payload, msgData, ()=>{});
  }
  if (fcmTokens && fcmTokens.length > 0){
    fcmSend(null, fcmTokens, title, payload, msgData, ()=>{});
  }
}

export function comparePinRole(params) {
  let data = Math.floor(Math.random() * (9 - 1) ) + 1;
  console.log('comparePinRole: msgData', data);
  console.log('comparePinRole: params.slice(1,2)', params.slice(1,2));
  if(params.slice(1,2) > data){
    return true
  }else{
    return false
  } 
}

function sortRecordResult(recordsList){
  let data = recordsList
  data.sort(function(a, b) {
    let aDate = new Date(a.createTime);
    let bDate = new Date(b.createTime);
    return aDate.getTime()- bDate.getTime();
  });
  //console.log(data);
  return data
}

function inputOutpatientIdPatientId(bean, callback){
  let {input} = bean;
  if (!input||!input.appointmentData||!input.appointmentData.outpatientId||!input.appointmentData.outpatientId._id){
    return callback && callback({name:'DataNotFound'}); 
  }
  if (!input||!input.appointmentData||!input.appointmentData.patientId){
    return callback && callback({name:'DataNotFound'}); 
  }
  console.log('input.appointmentData: ', input.appointmentData);
  input.outpatientId = input.appointmentData.outpatientId._id
  input.patient = {};
  input.patient ={
    "_id": input.appointmentData.patientId,
    "code": "c"
  }
  return callback && callback(null);
}