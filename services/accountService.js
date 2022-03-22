import config from 'nconf';
import moment from 'moment';
import xss from 'xss';
import logger from '../config/log';
import request from 'request';
import packageJson from '../package.json';
import accountModel from '../models/accountModel';
import AppUpdateModel from '../models/appUpdateModel';
import UserLogModel from '../models/userLogModel';
import {errorCode} from '../models/type/mongooseErrorCode';
import {uuidv4, tokenSign, refreshTokenSign, tokenVerify, refreshTokenVerify, hashPassword, hashString} from '../utils/stringUtil';
import {sendSMS} from '../utils/SMSUtil';
import {requestGoogleSiteVerify} from '../utils/httpUtil';
import {appVersionSetup} from '../utils/vidyoUtil';
import {decryptString} from '../utils/stringUtil';
import ActionType from '../models/type/actionType';
import UserType from '../models/type/userType';
import mongoose from 'mongoose';
import defaultConf from '../config/defaultConf';
import {createAUser} from '../utils/xmppUtil';


export {
  loginOutputData, 
	accountToLowerCase,
	profile,
	checkRepeatSignUp,
	create,
	regenVerifyCode,
	checkVerifyCode,
	resendVerifyCode,
	authenticate,
	regenToken,
	regenRefreshToken,
	getTokenAndVerify,
	setTokenInCookie,
	verifyRefreshToken,
	expiry,
	getErrorList,

	checkAppVersion,
	updateAppVersion,

	checkAccount,
	updateVerifyCode,
	updatePassword,
	resetPassword,
	sendVerifyCode,
	apiHealth,

	siteVerify,
	checkXmppUserValid,

	getAll,

	boomtest,
};

export const KEY_TOKEN = 'token';
export const SELECT_ACCOUNT = {createTime:0, modifyTime:0, creator:0, modifier:0, __target:0, __targetVer:0, valid:0, userType:0,};
export const SELECT_EMPLOYEE = {createTime:0, modifyTime:0, creator:0, modifier:0, __target:0, __targetVer:0, valid:0,};
export function SELECT_EMPLOYEE_PREFIX(prefix = '') {
	let SELECT = {};
	Object.assign(SELECT,
		...Object.keys(SELECT_EMPLOYEE).map((key) => ({[`${prefix}${key}`]: SELECT_EMPLOYEE[key]}))
	);
	return SELECT;
}
let {Types: {ObjectId}} = mongoose;

function loginOutputData(req, custom = {}) {
	if (req.body.user) {
		['iat','exp','iss','levelOneId','levelTwoId','levelThreeId','accountId', 'isInMeeting', 'fcmToken', 'apnToken', 'apnDebugToken', 'email'].forEach(k => {
			req.body.user[k] = undefined;
		});
	}
	return {
		'token': req.body.token,
		'refreshToken': req.body.refreshtoken,
		'tokenExpireIn': '4h',
		'meetingSystem': req.body.meetingSystem,
		'user': req.body.user,
		...custom,
	};
}
function accountToLowerCase(input) {
	if (input && input.account) {
		input.account = input.account.toLowerCase();
	}
	return input.account;
}
//profile
function profile(bean, req, callback) {
	let {input} = bean;
	accountModel.findOne({
		_id: input.accountId,
		valid: true,
	}).select(
		{...SELECT_ACCOUNT,}
	).exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.accountdata = result;
			return callback && callback(null);
		}
	});
}
function checkRepeatSignUp(bean, callback){
	let {input} = bean;
	accountModel.findOne({'account': input.account, 'valid': true})
	.exec((err, result) => {
		if(err) return callback && callback(err);
		if(result) return callback && callback({name:'RepeatSignup'});
		callback && callback(null);
	});	
}
//create
function create(bean, callback) {
	let {input, output} = bean;
	if (input.accountId) {
		return callback && callback(null);
	}
	console.log('input: ', input);
	//input.valid = false; 
	accountToLowerCase(input);
	let where = {
		'account': input.account,
		'valid': {'$ne': true}
  }
	let updateData = input;
	let salt = uuidv4();
	let nowTime =  moment();
	updateData.createTime = nowTime;
	updateData.modifyTime = nowTime;
	updateData.salt = salt;
	//updateData.password = hashPassword(input.password, salt, input.account, true);
	updateData.password = hashPassword(input.password, salt, null, false);
  accountModel.updateOne(where, {$set: updateData}, {upsert: true}, (err, result)=>{
    if (err) return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		accountModel.findOne({'account': input.account})
		.exec((err, idResult) => {
			if(err) return callback && callback(err);
			if(!idResult) return callback && callback({name:'DataNotFound'});
			input.accountId = idResult._id;
			let data = {
				'accountId': input.accountId,
				//'verifyCode': input.verifyCode
			}
			output.result = data;
			callback && callback(null);
		});	
  });
}
//產生簡訊驗證碼
function regenVerifyCode(bean, callback) {
	let {input} = bean;
	input.verifyCode = genVerifyCode();
	console.log('[regenVerifyCode] verifyCode: ', input.verifyCode);
	accountToLowerCase(input);
	return callback && callback(null);
}
//查簡訊驗證碼
function checkVerifyCode(bean, callback) {
	let {input} = bean;
  let where = {
		'_id': input.accountId,
		//'valid': false,
		'verifyCode': input.verifyCode
	};
	let updateData = {
		'valid': true,
		'activation': moment()
	};
  accountModel.update(where, {$set: updateData}
	, (err, updateResult) => {
		console.log('updateResult: ', updateResult);
		if (err) return callback(err, null);
		if (!updateResult.nModified) return callback && callback({name: 'VerifyCodeError'});
		return callback && callback(null);
	}); 
}
//重送驗證碼
function resendVerifyCode(bean, callback) {
	let {input} = bean;
	let where = {
		'account': input.account
	};
	input.verifyCode = genVerifyCode();
	let updateData = {
		'verifyCode': input.verifyCode
	};
	accountModel.updateOne(where, {$set: updateData}, (err, result)=>{
		if(err) return callback && callback(err);
		if(!result) return callback && callback({name:'DataNotFound'});
		input.mobile = input.account;
		callback && callback(null);
	});	
}
//檢查帳密是否有相符的資料
function authenticate(bean, callback) {
	console.log('[login] authenticate/start!!');
	let {input} = bean;
	let match = {valid: true};
	if (input.xaccountId) {
		match._id = ObjectId(input.xaccountId);
	} else {
		match.account = accountToLowerCase(input);
	}
	accountModel.aggregate([
		{
			$match: match,
		},
		{
			$lookup: {
				'from': 'Employee',
				'localField': '_id',
				'foreignField': 'accountId',
				'as': 'employee',
			}
		},
		{
			$lookup: {
				'from': 'Customer',
				'localField': '_id',
				'foreignField': 'accountId',
				'as': 'customer',
			}
		},
		{
			$unwind: {
				path: '$employee',
				preserveNullAndEmptyArrays: true,
			}
		},
		{
			$unwind: {
				path: '$customer',
				preserveNullAndEmptyArrays: true,
			}
		},
		{
			$addFields: {
				user: {$cond: {if: {$eq: ['$userType', 'e'] }, then:
					'$employee',
				else:
					'$customer'
				}},
			}
		},
		// {
		// 	$addFields: {
		// 		user: {$cond: {if: {$gt: [{$size: '$employee'}, 0] }, then:
		// 			{$arrayElemAt: ['$employee', 0]},
		// 		else:
		// 			{$arrayElemAt: ['$customer', 0]}
		// 		}},
		// 	}
		// },
		{
			$sort: {
				'user.createTime': -1,
			}
		},
		{
			$match: {'user.valid': true},
		},
		{
			$project: {
				...SELECT_ACCOUNT, employee:0, customer:0, ...SELECT_EMPLOYEE_PREFIX('user.'),
			}
		},
	], (err, results) => {
		if (err) {
			return callback && callback(err);
		} else if (!results || results.length == 0) {
			return callback && callback({name: 'LoginError'});
		} else {
			let account = results[0];
			if (!account.salt) {
				account.salt = uuidv4();
				account.password = hashPassword(account.password, account.salt, account.account, true);
				accountModel.findOneAndUpdate({_id: account._id}, {$set: {password:account.password, salt:account.salt}}, () => {});
			}
			if (!input.xaccountId) {
				let db = account.password;
				let check = hashString(input.password, account.salt);
				if (db !== check) {
					return callback && callback({name: 'LoginError'});
				}
			}
			account.password = undefined;
			account.salt = undefined;
			//console.log('account:::: ', account);
      account.user.personalId = decryptString(account.user.personalId);
      account.user.name = decryptString(account.user.name);
			account.user.loginTimeStamp = new Date();
			input.loginTimeStamp = account.user.loginTimeStamp;
			input.accountdata = account;
			return callback && callback(null);
		}
	});
}
//產生token
function regenToken(bean, req, callback) {
	let {input} = bean;
	//console.log('[login] regenToken/start!!  input:', input);
	let data = input.accountdata;
	let user = data.user;
	let tokenData = JSON.parse(JSON.stringify(data.user));
	if(tokenData.apnToken) delete tokenData.apnToken;
	if(tokenData.fcmToken) delete tokenData.fcmToken;
	//console.log('[login] regenToken/start!!  user:', user);
	//console.log('[login] regenToken/start!! tokenData:', tokenData);
	tokenSign(tokenData, (err, token) => {
		if (err) {
			return callback && callback(err);
		}
		req.body.token = token;
		req.body.user = user;
		return callback && callback(null);
	});
}
//產生token
function regenRefreshToken(bean, req, callback) {
	let {input} = bean;
	//console.log('[login] regenRefreshToken/start!!  input:', input);
	let data = input.accountdata;
	let user = {
		accountId: data._id,
	};
	refreshTokenSign(user, (err, token) => {
		if (err) {
			return callback && callback(err);
		}
		req.body.refreshtoken = token;
		return callback && callback(null);
	});
}
//getTokenAndVerify
function getTokenAndVerify(req, res, callback) {
	let token = req.body.token;
	if (!token) {
		let k = 'Bearer ';
		let t = req.headers['authorization'];
		if (t && t.startsWith(k)) {
			token = t.replace(k, '').trim();
		}
	}
	if (!token) {
		((req.headers['cookie']||'').split(';')).some((cookie)=>{
			let index = cookie.indexOf(`${KEY_TOKEN}=`);
			if (index>=0){
				token = cookie.substr(index+KEY_TOKEN.length+1);
			}
			return token != null;
		});
	}
	req.body.token = null;
	req.body.user = null;
	tokenVerify(token, (err, data) => {
		if (err || !data) {
			return callback && callback(err);
		} else {
			req.body.token = token;
			req.body.user = data;
			checkLoginTimeStamp(req.body.user, (err)=>{
        if(err) return callback && callback(err);
				return callback && callback(null, data);
			})
		}
	});
}

function checkLoginTimeStamp(user, callback){
  let now = new Date();
  let queryStart = moment(now).subtract(72, 'hours');
  let where = {
    'valid': true,
    'action' : ActionType.LOGOUT.value,
    'loginTimeStamp': user.loginTimeStamp,
    'createTime': {'$gte': queryStart}
  }
  if(user.code == 'e'){
    where.employeeId = user._id
  }else if(user.code == 'c'){
    where.customerId = user._id
  }
  UserLogModel.findOne(where)
  .select(' -__target -__targetVer -valid')
  .exec((err, result) => {
		logger.info('[checkLoginTimeStamp] result:', String(result));
		console.log('[checkLoginTimeStamp] result:', result);
    if(err) return callback && callback(err);
    if(result) return callback && callback({name: 'JsonWebTokenError'});
    callback && callback(null);
  });
}
//setTokenInCookie
function setTokenInCookie(bean, req, res, callback) {
	let token = xss(req.body.token);
	//console.log('[login] setTokenInCookie/start!!  req.body:', req.body);
	//let {input} = bean;
	if (token) {
		//console.log('[login] setTokenInCookie/start!!  req.body:',req.body.token);
		//req.body.token = xss(req.body.token);
		//console.log('[login] setTokenInCookie/2222  req.body:', req.body.token);
		let expires = moment().add(Number(config.get('COOKIE_EXPIRED')), 's').toDate();
		res.cookie(KEY_TOKEN, token, {expires: expires, httpOnly: true});
	}
	return callback && callback(null);
}

//verifyRefreshToken
function verifyRefreshToken(bean, req, res, callback) {
	bean.input.xaccountId = undefined;
	refreshTokenVerify(req.body.token, (err, accountId) => {
		if (err || !accountId) {
			switch(err.name) {
				default:
					err.name = 'AuthenticateError';
				break;	
				case 'TokenExpiredError':
					err.name = 'RefreshTokenExpiredError';
				break;
				case 'JsonWebTokenError':
					err.name = 'JsonWebTokenError';
				break;	
					//return res.status(400).send({'success': false, 'errors': errorMsg(err)});
			}
			return callback && callback(err);
		} else {
			bean.input.xaccountId = accountId;
			return callback && callback(null);
		}
	});
}

//登出 
function expiry(bean, req, res, callback) {
	//let {input} = bean;
	// console.log('req.body: ', req.body);
	req.session.cookie.expires = new Date(Date.now())
	req.session.save(function() {
  // session saved
  return callback && callback(null);
  })
	
// req.session.destroy(function(err) {
//   // cannot access session here
//   return callback && callback(null);
// })
	
}

function getErrorList(bean, callback) {
  let {output} = bean;
	let data = {};
	let result={};
	Object.keys(errorCode).map((currentValue)=>{
		result[errorCode[currentValue][0]] = errorCode[currentValue][1]
	})
	//console.log('result: ', result);
  data.errorList = result;
  output.result = data;
  return callback && callback(null);
}
const hostTest = 'https://teleapi.healthplus.tw'
//const hostTest = 'http://localhost:3001'
function boomtest(bean, callback){
	let { input, output} = bean;
  let body = {
		"queryStartTime": "2022-01-12T00:00:00.000Z",
	"daysRange": "18",
	"isShowNoFile": true
 }
  let Options = {
    //'url': hostTest +'/v1.0.2/user/listEmployee',
		'url': hostTest +'/v1.0.2/appointment/getConsultingRecords',
    'body': JSON.stringify(body),
		'headers': {
			'Content-Type': 'application/json',
			'scope': '_id',
			'role': '4096'
		}
  };
  //console.log('[requestCreateZoomUser] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);     
		//console.log('[requestCreateZoomUser] results:', results);
    let userResult = JSON.parse(results);  
  
    console.log('[requestCreateZoomUser] userResult:', userResult);
		output.result = userResult.data.recordsList;

		let req1 = [];

		output.result.forEach((ele, index, array) => {
			//console.log('ele: ',ele)
			let randN = Math.floor((Math.random() * 100) + 1);
			//console.log('randN: ',randN)
			if(randN>=10 && randN<=85){
				//console.log('ele._id: ',ele._id)
				if(ele.doctorId && !req1.includes(ele.doctorId._id))req1.push(ele.doctorId._id);
			}
		});
		console.log('req1: ',req1)
		console.log('req1.length: ',req1.length)
		// let i =0;
		// req1.forEach((currentValue, index)=>{
		// 	let randNST = Math.floor((Math.random() * 10000) + 1);
		// 	setTimeout(function(){
    //       CCAppVersion(currentValue);
    //  			console.log('mapmapmapmapmap  currentValue: ',currentValue) 
		// 			i++; 
		// 			console.log('i: ',i)
		// 			if(req1.length == i) console.log('Finish!!!!!! ')
		// 	}, randNST*index*index);
		// })

    callback && callback(null);
  });

}


function CCAppVersion(req) {
	let idT = new ObjectId();
	console.log('idT: ',idT)
	let OPALL = {
		//'url': hostTest +'/v1.0.2/account/checkAppVersion',
		'url': hostTest +'/v1.0.2/account/updateDoctor',
		"body": {
	    "doctorId": req,
      "accountId": idT
		},
		'headers': {
			'Content-Type': 'application/json',
			'scope': '_id',
			'role': '4096'
		}
	}
	OPALL.body = JSON.stringify(OPALL.body);
  request.post(OPALL, function(err, response, results) {
    let userResult = JSON.parse(results);   
    console.log('[requestCreateZoomUser] userResult:', userResult);
  });
}

function checkAppVersion(bean, callback){
  let { input, output} = bean;
  let where = {
    'valid': true,
		'platform' : input.platform,
    'appName' : input.appName
  }
	AppUpdateModel.findOne(where)
	.select('updateLevel bulidNumber version')
  .exec((err, result) => {
    if(err) return callback && callback(err);
		if(!result) return callback && callback({name:'DataNotFound'});
		let data = {
			'updateLevel': "0",
			'nowVersion': result.version
		};
		let updateLevel = {
			'updateLevel': result.updateLevel
		}
		console.log("result: ", result);
		let inputVersion = input.version.split(".");
    if(input.userType == UserType.EMPLOYEE.value) appVersionSetup(bean);
		let newVersion = result.version.split(".");
		console.log("inputVersion: ", inputVersion);
		console.log("newVersion: ", newVersion);
		//if (inputVersion.length != newVersion.length) return callback && callback({name:'ParamMalformedError'});
		if(inputVersion[0] < newVersion[0]){
			output.result = updateLevel;
			return callback && callback(null);
		}else	if(inputVersion[0] == newVersion[0]){
			if(inputVersion[1] && inputVersion[1] < newVersion[1]){
				output.result = updateLevel;
				return callback && callback(null);
			}else if (inputVersion[1] == newVersion[1]){
				if(inputVersion[2] < newVersion[2]){
					output.result = updateLevel;
					return callback && callback(null);
				}
			}
		}
		output.result = data;
    callback && callback(null);
  });
}

function updateAppVersion(bean, callback) {
	let {input, output} = bean;
  let where = {
		'valid': true,
		'appName': input.appName,
		'platform' : input.platform,
	};
  AppUpdateModel.updateOne(where, {$set: input}
	, (err, updateResult) => {
		console.log('updateResult: ', updateResult);
		if (err) return callback && callback(err);
		output.result = updateResult;
		return callback && callback(null);
	}); 
}

function siteVerify(bean, callback){
	let {input, output} = bean;
	console.log(input);
	requestGoogleSiteVerify(defaultConf.GOOGLE_SITEVERIFY_SECRET, input.response, (err, result)=>{
		if(err) return callback && callback(err);
		output.result = JSON.parse(result);
		callback && callback(null);
	});
}

function checkAccount(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true,
		'account' : input.account
  }
	accountModel.findOne(where)
	.select('_id')
  .exec((err, result) => {
    if(err) return callback && callback(err);
		if(!result) return callback && callback({name:'DataNotFound'});
		input.accountId = result._id;
		input.mobile = input.account;
    callback && callback(null);
  });
}

function updateVerifyCode(bean, callback) {
	let {input, output} = bean;
  let where = {
		'_id': input.accountId,
		'valid': true,
	};
	let updateData = {
		'verifyCode': input.verifyCode
	};
  accountModel.update(where, {$set: updateData}
	, (err, updateResult) => {
		console.log('updateResult: ', updateResult);
		if (err) return callback && callback(err);
		if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
		output.result = input;
		return callback && callback(null);
	}); 
}

function updatePassword(bean, callback) {
	let {input} = bean;
	let salt = uuidv4();
	let account = input.userData.accountId.account;
	let oldSalt = input.userData.accountId.salt
	//console.log('oldPassword: ', hashPassword(input.oldPassword, oldSalt, account, true),);
	console.log('oldPassword: ', hashPassword(input.oldPassword, oldSalt, null, false));
  let where = {
		'account': account,
		//'password': hashPassword(input.oldPassword, oldSalt, account, true),
		'password': hashPassword(input.oldPassword, oldSalt, null, false),
		'valid': true,
	};
	let updateData = {
		'salt': salt,
		//'password': hashPassword(input.newPassword, salt, account, true)
		'password': hashPassword(input.newPassword, salt, null, false)
	};
  accountModel.update(where, {$set: updateData}
	, (err, updateResult) => {
		//console.log('updateResult: ', updateResult);
		if (err) return callback && callback(err);
		if (!updateResult.nModified) return callback && callback({name: 'OldPasswordError'});
		return callback && callback(null);
	}); 
}

function resetPassword(bean, callback) {
	let {input} = bean;
  let where = {
		'account': input.account,
		'verifyCode': input.verifyCode,
		'valid': true,
	};
	let salt = uuidv4();
	let updateData = {
		'salt': salt,
		'verifyCode': genVerifyCode(),
		//'password': hashPassword(input.password, salt, input.account, true)
		'password': hashPassword(input.password, salt, null, false)
	};
  accountModel.update(where, {$set: updateData}
	, (err, updateResult) => {
		console.log('updateResult: ', updateResult);
		if (err) return callback && callback(err);
		if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
		return callback && callback(null);
	}); 
}

function genVerifyCode(){
	return String(Math.floor(Math.random() * (99999 - 10000) ) + 10000);
}

function sendVerifyCode(bean, callback) {
	let {input} = bean;
	if(!input.mobile || !input.verifyCode) return callback && callback({name:'ParamMalformedError'});
	let message = "遠距醫療 您的認證碼: " + String(input.verifyCode);
	sendSMS(input.mobile, message, (err)=>{
		if (err) return callback && callback(err);
		//console.log('result: ', result);
		return callback && callback(null);
	});
}

function apiHealth(bean, callback){
	let {output} = bean;
	let data = {
		'service': packageJson.name,
    //'status': "200",
    'version': packageJson.version,
    'note': ""
	}
	output.result = data;

  return callback && callback(null);
}

export function dbtest (callback){
  let where = {
    'valid': true,
		//"account" : "fetuser1",
  }
	accountModel.find(where)
	.select('account')
  .exec((err, result) => {
    if(err) return callback && callback(err);
		if(!result) return callback && callback({name:'DataNotFound'});
		result.forEach((ele) => {
			console.log('ele: ',ele)
			dbtestUpdate(ele.account);
		});

    callback && callback(null);
  });
}

export function dbtestUpdate (account){
	let salt = uuidv4();
  let where = {
    "account" : account,
		'valid': true,
	};
	let updateData = {
		'salt': salt,
		'password': hashPassword("123456", salt, account, true)
	};
  accountModel.update(where, {$set: updateData}
	, (err, updateResult) => {
		console.log('updateResult: ', updateResult);
		if (err) return console.log('err: ', err);
	}); 
}

function checkXmppUserValid(bean, callback) {
	let {input} = bean;
	//console.log('checkXmppUserValid: ', input);
	let userId = input.accountdata.user._id;
	let userCode = input.accountdata.user.code;
	if (input.role == 'share') userId = 'share'+ userId;
	createAUser(userId,(err, result)=>{
		if(result && result=='OK'){
			//console.log('[checkXmppUserValid]  result: ', result);
		}else{
			logger.info(`[checkXmppUserValid] 
				userId: ${userId}, 
				code: ${userCode}, 
				msg: ${result}
			`);
		}
		return callback && callback(null);
	});
}

function getAll(bean, callback){
	let {output} = bean;
	accountModel.find()
	.exec((err, result) => {
		if(err) return callback && callback(err);
      output.result = result
		
		return callback && callback(null);
	});	
}
