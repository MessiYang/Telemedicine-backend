import UserLogModel from '../models/userLogModel';
import ActionType from '../models/type/actionType';
import moment from 'moment';
import async from 'async';
import mongoose from 'mongoose';
import request  from 'request';
import logger from '../config/log';
import CustomerModel from '../models/customerModel';
import EmployeeModel from '../models/employeeModel';
import AppointmentModel from '../models/appointmentModel';
import InviteRecordModel from '../models/inviteRecordModel';
import AppointmentType from '../models/type/appointmentType';
import {getAllUserOnlineStatus} from '../utils/xmppUtil';
import {decryptString, pushMessage} from '../utils/stringUtil';
import defaultConf from '../config/defaultConf';

let {Types: {ObjectId}} = mongoose;

export {
  getUserLogs,
  createUserLogs,
  checkPassword,
  getActionType,

  createAppLog,
  updateUserAppVersion,

  getDashboardData,
  getDashboardAbnormalLog,

  addUserLoginStatus,

  notifyAllPatient,
};

function getUserLogs(bean, user, callback){
  let {output} = bean;
  let where = {
    'valid': true,
  }
  if(user.code == 'e'){
    where.employeeId = user._id
  }else if(user.code == 'c'){
    where.customerId = user._id
  }
  UserLogModel.find(where)
  .select(' -__target -__targetVer -valid')
  .limit(50)
  .sort({'createTime': -1})
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result;
    callback && callback(null);
  });
}

function createUserLogs(bean, user, action, callback) {
  let {input} = bean;
  let saveData = {
    'action': action,
  }
  if(input.remoteAddr) saveData.remoteAddr = input.remoteAddr;
  if(user.loginTimeStamp) saveData.loginTimeStamp = user.loginTimeStamp;
  if(user.code == 'e'){
    saveData.employeeId = user._id
  }else if(user.code == 'c'){
    saveData.customerId = user._id
  }
  logger.info('[createUserLogs] saveData: ',saveData);
  new UserLogModel(saveData).save((err, result) => {
		if (err) 	return callback && callback(err);
    if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function checkPassword(bean, user, callback){
  let {output} = bean;
  let now = new Date();
  let queryStart = moment(now).subtract(3, 'months');
  let where = {
    'valid': true,
    'action': ActionType.CHANGE_PW.value,
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
    if(err) return callback && callback(err);
    let data = {};
    if(result) {
      data.needUpdatePassword = false;
    }else{
      data.needUpdatePassword = true;
    }
    output.result = data;
    callback && callback(null);
  });
}

function getActionType(bean, callback) {
  let {output} = bean;
  let data = {};
  data.actionTypeList = ActionType.toOutput()
  output.result = data;
  return callback && callback(null);
}

function createAppLog(bean, callback) {
  let {input} = bean;
  let log = {
    'platform': input.platform,
    'appName': input.appName,
    'version': input.version,
    'logData': input.logData
  }
  logger.info('[APPLOG] '+JSON.stringify(log));
  return callback && callback(null);
}

function updateUserAppVersion(bean, callback){
  let {input} = bean;
  console.log('[updateUserAppVersion]input: ', input);
  if(!input.logData||!input.logData.length||!input.logData[(input.logData.length)-1].userProfile||
    !input.logData[(input.logData.length)-1].userProfile._id)return callback && callback(null);
  if(!input.platform||!input.appName||!input.version)return callback && callback(null);
  let userProfile = input.logData[(input.logData.length)-1].userProfile;
  let where = {
    'valid': true,
    '_id': userProfile._id
  }
  let updateData = {
    'platform': input.platform,
    'appName': input.appName,
    'version': input.version,
  }
  userModel(userProfile.code).findOneAndUpdate(where, updateData, {new: false}, (err, updateResult) => {
    //console.log('[updateUserAppVersion]updateResult: ', updateResult);
    if (err) return callback && callback(err);
    //if (!updateResult) return callback && callback({name: 'DataNotFound'});
    callback && callback(null);
  });
}

function userModel(code){
  if(code == 'e'){
    return EmployeeModel
  }else if(code == 'c'){
    return CustomerModel
  }
}

function getDashboardData(bean, callback){
  let {output} = bean;
  let onlineUserList = [];
  let now = new Date();
  output.result = {};
  async.series({
    getXmppOnlineIdList: (cb)=> {
      getAllUserOnlineStatus((err, result)=>{
        if(err) return callback(err, null);
        console.log('onlineList: ', result);
        if(result && result.length) {
          result.forEach((ele) => {
            if(ObjectId.isValid(ele)) onlineUserList.push(ObjectId(ele));
          });
        }
        //onlineUserList= [ObjectId('5d22a94d7c9ad06c40b4bbe8'),ObjectId('5d3a560b23474c737cd244c1'), ObjectId('5d8c55c332b481639c5fb264'), ObjectId('5d3a560b23474c737cd244c3')]
        console.log('onlineUserList: ', onlineUserList);
        cb();
      });
    },
    userInMeetingStatistics: (cb)=> {
      let aggregateArray = [];
      aggregateArray.push({
        $match:{
          'valid': true,
          '_id': { $in: onlineUserList},
          'isInMeeting': true
        }
      });
      aggregateArray.push({
        $lookup: {
          'from': 'Company',
          'localField': 'companyId',
          'foreignField': '_id',
          'as': 'companyId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$companyId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $project: {
          '_id': 1,
          'name': 1,
          'isInMeeting':1,
          'meetingDurationTime': {$cond: [{$eq: ['$isInMeeting', true]}, 
                                    { $divide: [{$subtract:[ now,'$meetingStartTime']}, 60000]}, null]}, //min
          'isReceiveNotification': 1,
          'meetingNumber': 1,
          'currentVidyoRoomUrl': 1,
          'currentVidyoPin': 1,
          'companyId': 1,
          'meetingStartTime': 1,
          'hospital': 1,
          'departmentCode': 1,
          'department': 1,
        }
      });
      aggregateArray.push({
        $sort: {
          meetingStartTime: 1,
        }
      }); 
      // if (defaultConf.USE_VIDYO){
        aggregateArray.push({
          $group: {
            '_id': {
              'vidyoPin': '$currentVidyoPin',
              'meetingNumber': '$meetingNumber',
            },
            'meetingStartTime':{ $min: '$meetingStartTime'},
            'meetingDurationTime':{ $max: '$meetingDurationTime'},
            'userList': { $push: {
              '_id': '$_id',
              'isInMeeting': '$isInMeeting',
              'joinMeetingTime': '$meetingStartTime',
              'meetingDurationTime': '$meetingDurationTime',
              'name': '$name',
              'isReceiveNotification': '$isReceiveNotification',
              'companyName': '$companyId.displayname',
              'hospital': '$hospital',
              'department': '$department',
              'departmentCode': '$departmentCode',
            }}
          }
        });
      // }else{
      //   aggregateArray.push({
      //     $group: {
      //       '_id': {
      //         'vidyoPin': '$currentVidyoPin',
      //         'meetingNumber': '$meetingNumber',
      //       },
      //       'meetingStartTime':{ $min: '$meetingStartTime'},
      //       'meetingDurationTime':{ $max: '$meetingDurationTime'},
      //       'userList': { $push: {
      //         '_id': '$_id',
      //         'isInMeeting': '$isInMeeting',
      //         'joinMeetingTime': '$meetingStartTime',
      //         'meetingDurationTime': '$meetingDurationTime',
      //         'name': '$name',
      //         'isReceiveNotification': '$isReceiveNotification',
      //         'companyName': '$companyId.displayname',
      //         'hospital': '$hospital',
      //         'department': '$department',
      //         'departmentCode': '$departmentCode',
      //       }}
      //     }
      //   });
      // }
      EmployeeModel.aggregate(aggregateArray, (err, result)=>{
        if(err) return callback && callback(err);
        if(!result) return cb();
        console.log('result: ', result);
        output.result.meetingStatistics = result;
        cb();
      });
    },
    onlineNotInMeetingUsers: (cb)=> {
      let aggregateArray = [];
      aggregateArray.push({
        $match:{
          'valid': true,
          '_id': { $in: onlineUserList},
          'isInMeeting': false
        }
      });
      aggregateArray.push({
        $lookup: {
          'from': 'Company',
          'localField': 'companyId',
          'foreignField': '_id',
          'as': 'companyId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$companyId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $project: {
          '_id': 1,
          'name': 1,
          'isInMeeting':1,
          'isReceiveNotification': 1,
          'meetingNumber': 1,
          'currentVidyoRoomUrl': 1,
          'companyName': '$companyId.displayname',
          'hospital': 1,
          'departmentCode': 1,
          'department': 1,
        }
      });
      EmployeeModel.aggregate(aggregateArray, (err, result)=>{
        if(err) return callback && callback(err);
        if(!result) return cb();
        console.log('result: ', result);
        output.result.onlineStatistics = result;
        cb();
      });
    },
    todayAppointmentList: (cb)=> {
      let aggregateArray = [];
      aggregateArray.push({
        $match:{
          'valid': true,
          'expectedStartTime': {'$gte': moment(now).startOf('day').toDate(), '$lte': moment(now).endOf('day').toDate()}, 
        }
      });
      aggregateArray.push({
        $lookup: {
          'from': 'Outpatient',
          'localField': 'outpatientId',
          'foreignField': '_id',
          'as': 'outpatientId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$outpatientId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $lookup: {
          'from': 'Customer',
          'localField': 'patientId',
          'foreignField': '_id',
          'as': 'patientId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$patientId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $lookup: {
          'from': 'Employee',
          'localField': 'outpatientId.doctorId',
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
          'localField': 'companyId',
          'foreignField': '_id',
          'as': 'companyId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$companyId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $project: {
          '_id': 0,
          'status': 1,
          'sequence': 1,
          'expectedStartTime': 1,
          'outpatientStatus': '$outpatientId.status',
          'outpatientId': '$outpatientId._id',
          'outpatientStartTime': '$outpatientId.startTime',
          'outpatientEndTime': '$outpatientId.endTime',
          'doctorId': '$doctorId._id',
          'companyId': '$doctorId.companyId',
          'doctorName': '$doctorId.name',
          'hospital': '$doctorId.hospital',
          'department': '$doctorId.department',
          'patientName': '$patientId.name',
        }
      });
      aggregateArray.push({
        $sort: {
          sequence: 1,
        }
      }); 
      aggregateArray.push({
        $group: {
          '_id':{
            outpatientId:'$outpatientId',
            outpatientStatus:'$outpatientStatus',
            outpatientStartTime:'$outpatientStartTime',
            outpatientEndTime:'$outpatientEndTime',
            doctorId:'$doctorId',
            doctorName:'$doctorName',
            hospital:'$hospital',
            department:'$department',
          },
          'patientList':{
            $push: {
              'patientName': '$patientName',
              'sequence': '$sequence',
              'expectedStartTime': '$expectedStartTime'
            }
          },
        }
      });
      AppointmentModel.aggregate(aggregateArray, (err, result)=>{
        if(err) return callback && callback(err);
        if(!result) return cb();
        //console.log('result: ', result);
        result.forEach(ele => {
          if(ele.patientList && ele.patientList.length){
            ele.patientList.forEach(element => {
              if(element.patientName)element.patientName = decryptString(element.patientName);
            });
          }
        });
        output.result.outpatientList = result;
        cb();
      });
    },
    todayMeetingRecords: (cb)=> {
      let queryStartTime =  moment().startOf('day');
      let daysRange = "1";
      let queryEndTime = moment(queryStartTime).add(daysRange, 'days');
      let aggregateArray = [];
      aggregateArray.push({
        $match:{
          'valid': true,
          'isAcceptInviteMeeting': true,
          'status' : AppointmentType.CONS.value,
          'createTime': {'$gte': moment(queryStartTime).toDate(), '$lt': queryEndTime.toDate()}
        }
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
        $lookup: {
          'from': 'Employee',
          'localField': 'consultantDoctorId',
          'foreignField': '_id',
          'as': 'consultantDoctorId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$consultantDoctorId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $lookup: {
          'from': 'Company',
          'localField': 'consultantDoctorId.companyId',
          'foreignField': '_id',
          'as': 'consultantDoctorId.companyId',
        }
      });
      aggregateArray.push({
        $unwind: {
          path: '$consultantDoctorId.companyId',
          preserveNullAndEmptyArrays: true,
        }
      });
      aggregateArray.push({
        $project: {
          '_id': 1,
          'doctorId._id': 1,
          'doctorId.name': 1,
          'doctorId.department': 1,
          'doctorId.companyId._id': 1,
          'doctorId.companyId.displayname': 1,
          'consultantDoctorId._id': 1,
          'consultantDoctorId.name': 1,
          'consultantDoctorId.department': 1,
          'consultantDoctorId.companyId._id': 1,
          'consultantDoctorId.companyId.displayname': 1,
          'createTime': 1,
        }
      });
      aggregateArray.push({
        $group: {
          '_id': '$_id',
          'createTime': { $first: '$createTime'},
          'doctorId': { $first: '$doctorId'},
          'consultantDoctorId':{ $push: '$consultantDoctorId'},
        }
      });
      aggregateArray.push({
        $sort: {
          createTime: 1,
        }
      }); 
      AppointmentModel.aggregate(aggregateArray, (err, result)=>{
        if (err) return callback && callback(err);
        if (!result || !result.length) return cb();
        output.result.todayMeetingRecords = result
        cb();
      });
    },
  }, (err)=> {
    if (err) return callback && callback(err);
    callback && callback(null);
  });
}

function getDashboardAbnormalLog(bean, callback){
  let {output} = bean;
  output.result = {};
  async.series({
    getXmppOnlineIdList: (cb)=> {
      let queryStartTime =  moment().startOf('day');
      let daysRange = "1";
      let queryEndTime = moment(queryStartTime).add(daysRange, 'days');
      let where = {
        'valid': true,
        'createTime': {'$gte': moment(queryStartTime).toDate(), '$lt': queryEndTime.toDate()},
        'isMissedCall': true
      }; 
      InviteRecordModel.find(where)
      .populate({
        path: 'launchDoctorId',
        select: '_id name companyId department',
        populate: {
          path: 'companyId',
          select: '_id displayname',
        }
      })
      .populate({
        path: 'invitedDoctorId',
        select: '_id name companyId department',
        populate: {
          path: 'companyId',
          select: '_id displayname',
        }
      })
      .sort({'createTime': -1})
      .select('-valid -modifyTime -haveRead')
      .limit(30)
      .exec((err, result) => {
        if (err) return callback && callback(err);
        let data = JSON.parse(JSON.stringify(result));
        data.forEach((ele) => {
          console.log('ele: ', ele);
          if(ele.isMissedCall) ele.logMsg = "視訊未接";
        });
        output.result.todayMeetingRecords = data; 
        cb();
      });  
    },
  }, (err)=> {
    if (err) return callback && callback(err);
    callback && callback(null);
  });
}

function addUserLoginStatus(bean, callback){
  let {output} = bean;
  async.map(output.result.doctorList, checkUserLoginOut, (err, results)=>{
    if (err) return callback && callback(err);
    console.log("[addUserLoginStatus] results: ", results);
    return callback && callback(null);
  });
  function checkUserLoginOut(user, cb){
    let where = {
      'valid': true,
      'employeeId': user._id,
      'action' :  {'$in':[ ActionType.LOGOUT.value, ActionType.LOGIN.value]},
    }
    UserLogModel.find(where)
    .select(' -__target -__targetVer -valid')
    .sort({'createTime': -1})
    .limit(3)
    .exec((err, result) => {
      let data = user;
      console.log('[checkUserLoginOut] result:', result);
      if(err) return callback && callback(err);
      data.isLogin = false;
      if(result && result.length && result[0].action == ActionType.LOGIN.value) {
        data.isLogin = true;
      }
      cb(null, data);
    });
  }
}

function notifyAllPatient(bean, callback) {
  let {input, output} = bean;
  let title = input.titleMsg;
  let msg = input.notifyMsg;
  // let title = 'Notify Test';
  // let msg = 'Notify Test';
  reqAllPatientFromProd((err, result) => {
     //let apnToken =  ["e4c9ec3106de809205a57b57234dc5440c8d200823096da73e6854a013efc20e"];
    // let fcmToken =  ["cQqmUVo3SemBI0AK51iAXW:APA91bE6hs8xEAPISZ_C-aq6s5PaK4GqLrX9VPYNBrlJp7DYCTbWjnfW0eiqLIO2N1IpxUCU8BYavoUfnSswzkZSum6Ai8X1Rpnj4av3neTze6cZLh4v9FZ13G53nt0Ik-Xs-XXgSi-N"];
    // console.log('[reqAllPatientFromProd] apnToken:', apnToken);
    // console.log('[reqAllPatientFromProd] fcmToken:', fcmToken);
    if(input.notifyTarget == "fcm"){
      let fcmToken =  result.fcmToken;
      async.mapLimit(fcmToken, 5, pushFCMByEach, (finish, results)=>{
        if (finish) logger.info("[StartRecordingRequest] finish: ", finish);
        logger.info("[StartRecordingRequest] results.length: ", results.length);
        return callback && callback(null);
      });
    }else if(input.notifyTarget == "apn"){
      let apnToken =  result.apnToken;
      async.mapLimit(apnToken, 5, pushAPNByEach, (finish, results)=>{
        if (finish) logger.info("[StartRecordingRequest] finish: ", finish);
        logger.info("[StartRecordingRequest] results.length: ", results.length);   
        return callback && callback(null);  
      });
    }else{
      return callback && callback(null);
    }

  })
  function pushAPNByEach(token, cb){
    setTimeout(function(){
      //logger.info(`[StartRecordingRequest] token: ${token}`);
      pushMessage(true, [token], null, title, msg, null, 'c');
      return cb(null);
    }, 600);
  }  
  function pushFCMByEach(token, cb){
    setTimeout(function(){
      //logger.info(`[StartRecordingRequest] token: ${token}`);
      pushMessage(true, null, [token], title, msg, null, 'c');
      return cb(null);
    }, 600);
  }  

}

function reqAllPatientFromProd(callback) {
  reqLoginProd((err, resultToken) => {
    let body = {
      "role": "all"
      }
    let Options = {
      'url': 'https://teleapi.healthplus.tw/v1.0.2/user/listCustomer',
      'body': JSON.stringify(body),
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+resultToken
      }
    };
    console.log('[reqAllPatientFromProd] Options:', Options);
    request.post(Options, function(err, response, results) {
      //console.log('[reqAllPatientFromProd] results:', results);
      if (err) return callback(err, null);
      if (!results) return callback({name:'ZoomErr'}, null);  
      results = JSON.parse(results) 
      let tokens = {
        'apnToken': [],
        'fcmToken': [],
      }
      results.data.map((ele) => {
        if(ele.apnToken && ele.apnToken.length>0) {
          tokens.apnToken = tokens.apnToken.concat(ele.apnToken);
          //tokens.apnToken = tokens.apnToken.concat(Math.floor((Math.random() * 10000) + 1));
        }
        if(ele.fcmToken && ele.fcmToken.length>0) {
          tokens.fcmToken = tokens.fcmToken.concat(ele.fcmToken);
          //tokens.fcmToken = tokens.fcmToken.concat(Math.floor((Math.random() * 10000) + 1));
        }
      });
      console.log('[reqAllPatientFromProd] tokens:', tokens);
      callback(null, tokens);
    });
  })
}

function reqLoginProd(callback) {
  let body = 
  {
    "account": "fetdevadmin",
    "password": "4d35d0ad8722bd0ce92f428a6c782820c1aee000e6fb22981eb47700"
    }
    // {
    //   "account": "fetadmin",
    //   "password": "68525f978bf53ca1eda9700e2d67e6cf739d5e28ed22ec69431465c5"
    //   }
  let Options = {
    'url': 'https://teleapi.healthplus.tw/v1.0.2/account/login',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': 'application/json'
    }
  };
  console.log('[reqLoginProd] Options:', Options);
  request.post(Options, function(err, response, results) {
    //console.log('[reqLoginProd] results:', results);
    if (err) return callback(err, null);
    if (!results) return callback({name:'ZoomErr'}, null);   
    results = JSON.parse(results)
    console.log('[reqLoginProd] results:', results);
    callback(null, results.data.token);
  });
  
}