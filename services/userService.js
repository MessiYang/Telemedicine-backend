import async from 'async';
import path from 'path';
import fs from 'fs';
import uuidv4 from 'uuid/v4';
import logger from '../config/log';
import AccountModel from '../models/accountModel';
import EmployeeModel from '../models/employeeModel';
import CustomerModel from '../models/customerModel';
import ZoomAccountModel from '../models/zoomAccountModel';
import AppointmentModel from '../models/appointmentModel';
import CompanyModel from '../models/companyModel';
//import socketIOUtil from '../utils/socketIOUtil';
import {getAllUserOnlineStatus} from '../utils/xmppUtil';
import RoleType from '../models/type/roleType';
import DepartmentCode from '../models/type/departmentCode';
import { requestLiveMeetingList, requestEndZoomMeeting } from '../utils/httpUtil';
import { noteUserToOnlineMsg, pushMessage, callUser } from '../utils/stringUtil';
import {hashPassword, decryptString, encrypt, decryptStringToTransform} from '../utils/stringUtil';
import {xmppSend} from '../utils/xmppUtil';
import mongoose from 'mongoose';
let {Types: {ObjectId}} = mongoose;

export {
  profile,
  getUser,
  checkUserPersonalId,
  checkUserUpdatePersonalId,
  validUser,
  createUser,
  setVoipToken,
  setApnToken,
  setFcmToken,
  removeApnToken,
  listEmployee,
  listCustomer,
  listCustomerToTransform,
  listCompany,
  queryDoctor,
  getRoleTypeList,
  getDepartmentCode,
  getDepartmentList,

  createDoctor,
  updateDoctor,
  removeDoctor,
  createPatient,
  updatePatient,
  updatePatientForApp,
  removePatient,

  //create,
  getZoomConfig,
  setNotification,
  initialLiveMeeting,
  updateUserInMeetingStatus,
  getUnReceiveNotificationIdList,
  checkUserRepeatLogin,
  checkPatientInMeeting,
  checkDoctorInMeeting,
  checkMeetingRoomsLimit,

  pushInviteOnlineMessage,
  uploadUserPhoto,

  sendMsgToMeetingMember,
  checkVidyoData,
};

function userModel(code){
  if(code == 'e'){
    return EmployeeModel
  }else if(code == 'c'){
    return CustomerModel
  }
}

function profile(bean, user, callback){
  let {input, output} = bean;
  let userCode = user.code;
	let where = {
    'valid': true,
    '_id': user._id
	}
  if(input.patientId){
    where._id = input.patientId;
    userCode = 'c'
  }
  userModel(userCode).findOne(where)
  .select('-__target -__targetVer -valid -modifyTime -createTime -apnDebugToken -accountId')
  .exec((err, result) => {
		if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    result.personalId = decryptString(result.personalId);
    result.name = decryptString(result.name);
    console.log('[getUser]result: ',result)
    input.userData = result;
    output.user = result;
		return callback && callback(null);
	});
}

function getUser(bean, user, callback){
  let {input, output} = bean;
  if(!user) user = input.patient;
  console.log('[getUser]user: ',user)
	let where = {
    'valid': true,
    '_id': user._id
	}
  userModel(user.code).findOne(where)
  .select('-__target -__targetVer -valid -modifyTime -createTime')
  .populate({
    path: 'accountId',
    select: '-valid -__target -__targetVer -modifyTime -createTime',
    //match: {'valid': true},
  })
  .exec((err, result) => {
		if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    result.personalId = decryptString(result.personalId);
    result.name = decryptString(result.name);
    console.log('[getUser]result: ',result)
    input.patientData = result;
    input.userData = result;
    output.userData = result;
		return callback && callback(null);
	});
}

function checkUserPersonalId(bean, callback){
  let {input} = bean;
  if(!input.personalId) return callback && callback(null);
	let where = {
    'valid': true,
	}
  userModel(input.code).find(where)
  .select('personalId name')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    result.forEach(ele => {
      ele.personalId = decryptString(ele.personalId);
      ele.name = decryptString(ele.name);
    });
    let data = findPersonalId(result, input.personalId);
    console.log('[checkUserPersonalId]RepeatPersonalIdSignup: ',data)
    if(data) return callback && callback({name:'RepeatPersonalIdSignup'});
		return callback && callback(null);
	});
}

function checkUserUpdatePersonalId(bean, userId, callback){
  let {input} = bean;
  if(!input.personalId) return callback && callback(null);
	let where = {
    'valid': true,
    '_id' : {'$ne': userId}
  }
  userModel(input.code).find(where)
  .select('personalId name')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    result.forEach(ele => {
      ele.personalId = decryptString(ele.personalId);
      ele.name = decryptString(ele.name);
    });
    let data = findPersonalId(result, input.personalId);
    console.log('[checkUserPersonalId]RepeatPersonalIdSignup: ',data)
    if(data) return callback && callback({name:'RepeatPersonalIdSignup'});
		return callback && callback(null);
	});
}

function validUser(bean, callback){
  let {input} = bean;
  let where = {
    'accountId': input.accountId,
  }
  let updateData =  {
    'valid': true,
  }
  CustomerModel.update(where, {$set: updateData}, (err, CResult)=>{
    if (err) return callback && callback(err);
    //if (!result.nModified) return callback && callback({name: 'DataNotFound'});
    console.log('CResult: ', CResult);
    EmployeeModel.update(where, {$set: updateData}, (err, EResult) => {
      console.log('EResult: ', EResult);
      if (err) return callback && callback(err);
      //if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
      return callback && callback(null);
    }); 
  });
}

function createUser(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true,
    'code': input.companyCode,
  };
  CompanyModel.findOne(where).exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'CreateError'});
    input.companyId = result._id;
    //input.valid = false;
    let userwhere = {
      "accountId" : input.accountId
    }
    let updateData = input;
    if (updateData.personalId) updateData.personalId = encrypt(updateData.personalId.toUpperCase());
    if (updateData.name && input.code == 'c') updateData.name = encrypt(updateData.name);
    updateData.isReceiveNotification = true;
    updateData.isInMeeting = false;
    updateData.apnToken = [];
    updateData.apnDebugToken = [];
    userModel(input.code).updateOne(userwhere, {$set: input}, {upsert: true}, (err, result)=>{
      if (err) 	return callback && callback(err);
      if (!result) return callback && callback({name: 'CreateError'});
      return callback && callback(null);
    });
  });
}

function setVoipToken(bean, callback){
  let {input} = bean;
  if(!input.voipToken) return callback && callback(null);
	let where = {
    '_id': input.accountdata.user._id,
    'voipToken': {$nin: [input.voipToken]}
	}
  let updateData = { 
    'voipToken': { $each: [input.voipToken], $slice: -1 }
  }
	userModel(input.accountdata.user.code).update(where, {'$push': updateData}, (err, result)=>{
		if(err) return callback && callback(err);
    console.log('[setApnToken]result: ',result)
		return callback && callback(null);
	});
}

function setApnToken(bean, callback){
  let {input} = bean;
  //console.log('[setApnToken] user: ',input.accountdata.user)
  if(!input.apnToken) return callback && callback(null);
	let where = {
    '_id': input.accountdata.user._id,
    'apnToken': {$nin: [input.apnToken]}
	}
	// let updateData = {
	// 	'apnToken': input.apnToken
  // }
  let updateData = { 
    'apnToken': { $each: [input.apnToken], $slice: -1 }
  }
	userModel(input.accountdata.user.code).update(where, {'$push': updateData}, (err)=>{
		if(err) return callback && callback(err);
    //if(!result || !result.n) return callback && callback({name:'DataNotFound'});
    //console.log('[setApnToken]result: ',result)
		return callback && callback(null);
	});
}

function setFcmToken(bean, callback){
  let {input} = bean;
  if(!input.fcmToken) return callback && callback(null);
	let where = {
    '_id': input.accountdata.user._id,
    'fcmToken': {$nin: [input.fcmToken]}
	}
	// let updateData = {
	// 	'fcmToken': input.fcmToken
  // }
  let updateData = { 
    'fcmToken': { $each: [input.fcmToken], $slice: -1 }
  }
	userModel(input.accountdata.user.code).update(where, {'$push': updateData}, (err)=>{
		if(err) return callback && callback(err);
    //console.log('[setFcmToken]result: ',result)
		return callback && callback(null);
	});
}

function removeApnToken(bean, user, callback){
  let {input} = bean;
  if(!input.apnToken && !input.fcmToken && !input.voipToken) return callback && callback(null);
	let where = {
    '_id': user._id
	}
	let updateData = {};
  if (input.voipToken) updateData.voipToken = input.voipToken;
  if (input.apnToken) updateData.apnToken = input.apnToken;
  if (input.fcmToken) updateData.fcmToken = input.fcmToken;
	userModel(user.code).update(where, {'$pull': updateData}, (err, result)=>{
		if(err) return callback && callback(err);
    //if(!result || !result.n) return callback && callback({name:'DataNotFound'});
    console.log('[removeApnToken]result: ',result)
		return callback && callback(null);
	});
}

function listEmployee(bean, user, callback){
  let {input, output} = bean;
  //console.log('[listEmployee]user: ',user)
  let where = {
    'valid': true,
  }
  if(input._id) where._id = ObjectId(input._id);
  if(input.departmentCode) where.departmentCode = input.departmentCode;
  if(input.companyId) where.companyId = ObjectId(input.companyId);
  if(input.role) where.role = input.role;
  if(input.vidyoPin) where.currentVidyoPin = input.vidyoPin;
  if(input.vidyoRoomUrl) where.currentVidyoRoomUrl = input.vidyoRoomUrl;
  console.log('[listEmployee]where: ',where)
    let aggregateArray = [];
    aggregateArray.push({
      $match: where
    });
    aggregateArray.push({
      $lookup: {
        'from': 'Account',
        'localField': 'accountId',
        'foreignField': '_id',
        'as': 'accountId',
      }
    });
    aggregateArray.push({
      $unwind: {
        path: '$accountId',
        preserveNullAndEmptyArrays: true,
      }
    });
    if(input.account){
      aggregateArray.push({
        $match:{
          'accountId.account': input.account
        }
      });
    }
    aggregateArray.push({
      $project: {
        'valid': 0,
        'code': 0,
        '__target': 0,
        'apnDebugToken': 0,
        '__targetVer': 0,
        'accountId.__target': 0,
        'accountId.__targetVer': 0,
        'accountId.userType': 0,
      }
    });
    EmployeeModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    input.EmployeeList = result;
    output.result = result;
    callback && callback(null);
  });
}

function listCompany(bean, callback){
  let {output} = bean;
  let where = {
    'valid': true
  }
  CompanyModel.find(where)
  .select(' -__target -__targetVer -valid')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result;
    callback && callback(null);
  });
}

function queryDoctor(bean, callback){
  let {output} = bean;
  let aggregateArray = [];
  console.log('RoleType.employee.DOCTOR.value: ', RoleType.employee.DOCTOR.value);
  aggregateArray.push({
    $match:{
      'valid': true,
      'role': RoleType.employee.DOCTOR.value
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
    $match:{
      'companyId.isOpenAppointment': {'$ne': false}
    }
  });
  aggregateArray.push({
    $group: {
      '_id':{
        region: '$companyId.region',
        companyName:'$companyId.displayname',
        companyId:'$companyId._id',
        department: '$department',
      },
      'doctorList':{
        $addToSet: {
          'doctorId': '$_id',
          'doctorName': '$name',
        }
      },
    }
  });
  aggregateArray.push({
    $group: {
      '_id':{
        companyName:'$_id.companyName',
        companyId:'$_id.companyId',
        region: '$_id.region',
      },
      'departmentList':{
        $addToSet: {
          'department': '$_id.department',
          'doctorList': '$doctorList',
        }
      },
    }
  });
  aggregateArray.push({
    $group: {
      '_id':{
        region: '$_id.region'
      },
      'companyList':{
        $addToSet: {
          'companyName':'$_id.companyName',
          'companyId':'$_id.companyId',
          'departmentList': '$departmentList',
        }
      },
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'region': '$_id.region',
      'companyList': 1
    }
  }); 
  aggregateArray.push({
    $project: {
      '_id': 0,
      'north': {
        $cond: {if: { $eq: [ "north", "$region" ] }, then: "$companyList", else: "$$REMOVE"}
      },
      'central': {
        $cond: {if: { $eq: [ "central", "$region" ] }, then: "$companyList", else: "$$REMOVE"}
      },
      'south': {
        $cond: {if: { $eq: [ "south", "$region" ] }, then: "$companyList", else: "$$REMOVE"}
      },
      'east': {
        $cond: {if: { $eq: [ "east", "$region" ] }, then: "$companyList", else: "$$REMOVE"}
      },
      // 'islands': {
      //   $cond: {if: { $eq: [ "islands", "$region" ] }, then: "$companyList", else: "$$REMOVE"}
      // },
    }
  });
  EmployeeModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    //console.log('result: ', result);
    let resultObj = {}
    result.forEach((ele)=>{
      resultObj = Object.assign(resultObj, ele);
    });
    //console.log('result: ', resultObj);
    output.result = resultObj;
    callback && callback(null);
  });
}

function listCustomer(bean, user, callback){
  let {input, output} = bean;
  let where = {
    'valid': true,
    'companyId': user.companyId
  }
  if(input.mobile) where.mobile = input.mobile;
  if(input.companyId) where.companyId = input.companyId;
  if(input.role) where.role = input.role;
  if(input.personalId) where = {'valid': true};
  if(user.name == "MiddlewareAdmin" && user.role.includes(1024)) delete where.companyId
  if(input.role == "all") where = {};
  console.log('[listCustomer] where: ', where);
  CustomerModel.find(where)
  .select(' -__target -__targetVer -apnDebugToken')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    result.forEach(ele => {
      ele.personalId = decryptString(ele.personalId);
      ele.name = decryptString(ele.name);
    });
    if(input.personalId){
      output.result = [findPersonalId(result, input.personalId)];
    }else{
      output.result = result;
    }
    input.customerList = output.result;
    callback && callback(null);
  });
}
function findPersonalId(userList, personalId){
  function isTheSamePersonalId(OutPatient) {
    return OutPatient.personalId == personalId ||OutPatient.personalId == personalId.toLowerCase() ;
  }
  let result = userList.find(isTheSamePersonalId);
  console.log('[listCustomer] result:', result);
  return result;
}

function listCustomerToTransform(bean, user, callback){
  let {input, output} = bean;
  let where = {
    'valid': true,
    'companyId': user.companyId
  }
  if(input.mobile) where.mobile = input.mobile;
  if(input.companyId) where.companyId = input.companyId;
  if(input.role) where.role = input.role;
  if(input.personalId) where = {'valid': true};
  if(input.role == "all") where = {};
  console.log('[listCustomer] where: ', where);
  CustomerModel.find(where)
  .populate({
    path: 'accountId'
  })
  .select(' -__target -__targetVer -apnDebugToken')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    result.forEach(ele => {
      ele.personalId = decryptStringToTransform(ele.personalId);
      ele.name = decryptStringToTransform(ele.name);
    });
    if(input.personalId){
      output.result = [findPersonalId(result, input.personalId)];
    }else{
      output.result = result;
    }
    input.customerList = output.result;
    callback && callback(null);
  });
}

function getRoleTypeList(bean, callback) {
  let {output} = bean;
  let data = {};
  data.employeeRoleList = RoleType.employee.toOutput();
  data.customerRoleList = RoleType.customer.toOutput()
  output.result = data;
  return callback && callback(null);
}

function getDepartmentCode(bean, callback) {
  let {output} = bean;
  let data = {};
  data.departmentCodeList = DepartmentCode.toOutput();
  output.result = data;
  return callback && callback(null);
}

function getDepartmentList(bean, user, callback) {
  let {output} = bean;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      'companyId': ObjectId(user.companyId),
      'department': {'$ne': null}
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$department',
      'doctorList':{
        $push: {
          '_id': '$_id',
          'name': '$name', // * field typo in deviceStatusHistoryModel * //
        }
      },
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'department': '$_id',
      'doctorList': 1
    }
  });
  EmployeeModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result;
    callback && callback(null);
  });
}

function createDoctor(bean, user, callback){
  let {input} = bean;
  console.log(input);
  let saveData = {
    'accountId': input.accountId,
    'name': input.name,
    'companyId': user.companyId,
    'department': input.department,
    'departmentCode': input.departmentCode,
    'role': [input.role]
  }
  if (input.hospital) saveData.hospital = input.hospital;
  if (input.hospitalCode) saveData.hospitalCode = input.hospitalCode;
  if (input.briefIntro) saveData.briefIntro = input.briefIntro;
  if (input.photoFileName) saveData.photoFileName = input.photoFileName;
  new EmployeeModel(saveData).save((err, result) => {
		if (err) 	return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function updateDoctor(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.doctorId,
    'valid': true,
  }
  let updateData = input;
  EmployeeModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result.nModified) return callback && callback({name: 'DataNotFound'});
    let where = {
      '_id': input.accountId,
      'valid': true,
    };
    let pwUpdate = {};
    if (input.password){
      const SALT = uuidv4();
      pwUpdate.salt = SALT;
      pwUpdate.password = hashPassword(input.password, SALT, null, false);
    }else{
      return callback && callback(null);
    }
    AccountModel.update(where, {$set: pwUpdate}
    , (err, updateResult) => {
      console.log('updateResult: ', updateResult);
      if (err) return callback && callback(err);
      if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
      return callback && callback(null);
    }); 
  });
}

function removeDoctor(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.doctorId,
    'valid': true,
  }
  let updateData = {
    'valid': false
  };
  EmployeeModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result.nModified) return callback && callback({name: 'DataNotFound'});
    let where = {
      '_id': input.accountId,
      'valid': true,
    };
    AccountModel.update(where, {$set: updateData}
    , (err, updateResult) => {
      console.log('updateResult: ', updateResult);
      if (err) return callback && callback(err);
      if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
      return callback && callback(null);
    }); 
  });
}

function createPatient(bean, user, callback){
  let {input} = bean;
  console.log(input);
  let saveData = {
    'accountId': input.accountId,
    'name': input.name,
    'companyId': user.companyId,
    'mobile': input.mobile,
    'role': [input.role]
  }
  if (input.personalId) saveData.personalId = input.personalId.toUpperCase();
  if (input.birthday) saveData.birthday = input.birthday;
  if (input.briefIntro) saveData.briefIntro = input.briefIntro;
  if (input.photoFileName) saveData.photoFileName = input.photoFileName;
  if (input.department) saveData.department = input.department;
  if (input.departmentCode) saveData.departmentCode = input.departmentCode;
  // if (input.relationalPatientId) saveData.relationalPatientId = input.relationalPatientId;
  if (input.wardName) saveData.wardName = input.wardName;
  if (input.wardCode) saveData.wardCode = input.wardCode;
  // if (input.relationship) saveData.relationship = input.relationship;
  // if (input.isMainContact) saveData.isMainContact = input.isMainContact;
  new CustomerModel(saveData).save((err, result) => {
		if (err) 	return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function updatePatient(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.patientId,
    'valid': true,
  }
  let updateData = input;
  if(updateData.personalId) updateData.personalId = encrypt(updateData.personalId.toUpperCase());
  if(updateData.name) updateData.name = encrypt(updateData.name);
  CustomerModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result.nModified) return callback && callback({name: 'DataNotFound'});
    let where = {
      '_id': input.accountId,
      'valid': true,
    };
    let pwUpdate = {};
    if (input.password){
      const SALT = uuidv4();
      pwUpdate.salt = SALT;
      pwUpdate.password = hashPassword(input.password, SALT, null, false);
    }else{
      return callback && callback(null);
    }
    AccountModel.update(where, {$set: pwUpdate}
    , (err, updateResult) => {
      console.log('updateResult: ', updateResult);
      if (err) return callback && callback(err);
      if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
      return callback && callback(null);
    }); 
  });
}

function updatePatientForApp(bean, user, callback){
  let {input} = bean;
  let where = {
    '_id': user._id,
    'valid': true,
  }
  let updateData = {};
  if(input.personalId) updateData.personalId = encrypt(input.personalId.toUpperCase());
  if(input.name) updateData.name = encrypt(input.name);
  if(input.birthday) updateData.birthday = input.birthday;
  console.log('updateData: ', updateData);
  CustomerModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result.nModified) return callback && callback({name: 'DataNotFound'});
    return callback && callback(null);
  });
}

function removePatient(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.patientId,
    'valid': true,
  }
  let updateData = {
    'valid': false
  };
  CustomerModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result.nModified) return callback && callback({name: 'DataNotFound'});
    let where = {
      '_id': input.accountId,
      'valid': true,
    };
    AccountModel.update(where, {$set: updateData}
    , (err, updateResult) => {
      console.log('updateResult: ', updateResult);
      if (err) return callback && callback(err);
      if (!updateResult.nModified) return callback && callback({name: 'DataNotFound'});
      return callback && callback(null);
    }); 
  });
}
// function create(bean, user, callback){
//   let {input} = bean;
//   new ZoomAccountModel(input).save((err, result) => {
// 		if (err) 	return callback && callback(err);
// 		if (!result) return callback && callback({name: 'CreateError'});
// 		return callback && callback(null);
// 	});
// }

function setNotification(bean, user, callback){
  let {input, output} = bean;
  let where = {
    'valid': true,
    '_id': user._id
  }
  let updateData = {
    'isReceiveNotification': input.isReceiveNotification
  }
  userModel(user.code).findOneAndUpdate(where, updateData, {new: true}, (err, updateResult) => {
    //console.log('updateResult: ', updateResult);
    if (err) return callback && callback(err);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    output.result = {
      "isReceiveNotification": updateResult.isReceiveNotification
    };
    callback && callback(null);
  });
}

function getZoomConfig(bean, user, callback){
  if(!user._id) return callback && callback(null);
  if(user.meetingSystem == "vidyo") return callback && callback(null);
  let {input} = bean;
  let where = {
    'valid': true,
    'doctorIdUsed': user._id
  };
  ZoomAccountModel.findOne(where).exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'NoMeetingAccount'});
    input.zoomConfig = {
      "ZOOM_API_KEY": result.APIKey,
      "ZOOM_API_SECRET": result.APISecret,
      "ZOOM_SDK_KEY": result.SDKKey,
      "ZOOM_SDK_SECRET": result.SDKSecret,
      "ZOOM_USERID": result.userId,
      "ZOOM_DOMAIN": "zoom.us"
    };
    callback && callback(null);
  });
}

function initialLiveMeeting(bean, callback){
  let {input} = bean;
  let liveMeetingNumberResult;
  async.series({
    findLiveMeeting: (cb)=> {
      requestLiveMeetingList(input.zoomConfig, (err, result)=>{
        if(err) return callback && callback(err);
        console.log('[findLiveMeeting] result:', result);
        if(!result.meetings || !result.meetings.length) return cb(null);
        liveMeetingNumberResult = result.meetings[0].id;
        cb(null); 
      }); 
    },
    endLiveMeeting: (cb)=> {
      if(!liveMeetingNumberResult) return cb(null);
      requestEndZoomMeeting(input.zoomConfig, liveMeetingNumberResult, (err)=>{
        //if(err) logger.info('[endLiveMeeting] err: ', err);
        if(err) return callback && callback(err);
        cb(null);
      }); 
    }
  }, (err)=> {
    if (err) return callback && callback(err);
    return callback && callback(null);
  });
}

function updateUserInMeetingStatus(bean, user, isInMeeting, callback){
  let {input} = bean;
  //console.log('[updateUserInMeetingStatus]input: ', input);
  let where = {
    'valid': true,
    '_id': user._id
  }
  let updateData = {
    'isInMeeting': isInMeeting
  }
  if(isInMeeting == true){
    if(input.msgData){
      if(input.msgData.vidyoRoomUrl) updateData.currentVidyoRoomUrl = input.msgData.vidyoRoomUrl;
      if(input.msgData.vidyoPin) updateData.currentVidyoPin = input.msgData.vidyoPin;
      if(input.msgData.meetingNumber) updateData.meetingNumber = input.msgData.meetingNumber;
    }
    if(user.meetingSystem == "vidyo"){
      if(input.vidyoRoomUrl) updateData.currentVidyoRoomUrl = input.vidyoRoomUrl;
      if(input.vidyoPin) updateData.currentVidyoPin = input.vidyoPin;
      updateData.meetingNumber = null;
    }else {
      updateData.currentVidyoRoomUrl = null;
      updateData.currentVidyoPin = null;
      if(input.meetingNumber) updateData.meetingNumber = input.meetingNumber;
    }
    updateData.meetingStartTime = new Date();
  }else{
    // let limitTime = moment().subtract(10, 'seconds');
    // where.meetingStartTime = {'$lt': limitTime};
    updateData.meetingNumber = '0';
    updateData.currentVidyoRoomUrl = '0';
    updateData.currentVidyoPin = '0';
    console.log('[updateUserInMeetingStatus] false!! where: ', where);
  }
  userModel(user.code).findOneAndUpdate(where, updateData, {new: true}, (err, updateResult) => {
    console.log('[updateUserInMeetingStatus]updateResult: ', updateResult);
    if (err) return callback && callback(err);
    //if (!updateResult) return callback && callback({name: 'DataNotFound'});
    callback && callback(null);
  });
}

function getUnReceiveNotificationIdList(callback){
  let where = {
    'valid': true,
    'isReceiveNotification': false
  }  
  let idList = [];
  EmployeeModel.find(where)
  .select('_id')
  .exec((err, employeeResults) => {
    console.log('employeeResults: ', employeeResults);
    if (err) return callback(err, null);
    CustomerModel.find(where)
    .select('_id')
    .exec((err, customerResults) => {
      console.log('customerResults: ', customerResults);
      if (err) return callback(err, null);
      let data = JSON.parse(JSON.stringify(employeeResults));
      data = data.concat(JSON.parse(JSON.stringify(customerResults)))
      console.log('data: ', data);
      data.forEach(element => {
        if(element._id) idList.push(element._id);
      });
      console.log('idList: ', idList);
      return callback(null, idList);
    });
  });
}

function checkUserRepeatLogin(bean, callback){
  let {input} = bean;
  if (input.role == 'share') return callback && callback();
  let userId = String(input.accountdata.user._id);
  console.log('userId: ', userId);
  getAllUserOnlineStatus((err, onlineList)=>{
    if(err) return callback(err, null);
    console.log('onlineList: ', onlineList);
    if (onlineList.includes(userId)){
      const EVENT =  'requestLogout/id/' + userId; 
      let msg = {}
      msg.userId = userId; 
      xmppSend(userId, EVENT, msg, (result)=>{
        if(result=='success'){
          return callback && callback(null);
        }else{
          return callback && callback({name: 'RepeatLogin'});
        }
      });
    }else{
      return callback && callback();
    }
  });
}

function checkPatientInMeeting(bean, callback){
  let {input} = bean;
  if(!input.appointmentId) return callback && callback();
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }  
  AppointmentModel.findOne(where)
  .select('patientId')
  .populate({
    path: 'patientId',
    select: '_id name isReceiveNotification isInMeeting',
    match: {'valid': true},
  })
  .exec((err, result) => {
    console.log('[checkPatientInMeeting] result: ', result);
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name: 'DataNotFound'});
    if(result && result.patientId && result.patientId.isInMeeting == true) 
      return callback && callback({name: 'InMeeting'});
    input.callToUser = {}
    if(result.patientId.name) input.callToUser.name = result.patientId.name;  
    console.log('[checkPatientInMeeting] input: ', input);
    return callback && callback();
  });
}

function checkDoctorInMeeting(bean, callback){
  let {input} = bean;
  if(!input.userId) return callback && callback();
  let where = {
    'valid': true,
    '_id': input.userId
  }  
  EmployeeModel.findOne(where)
  .populate({
    path: 'companyId',
    select: 'displayname'
  })
  .select('companyId department name isInMeeting isReceiveNotification')
  .exec((err, result) => {
    console.log('[checkDoctorInMeeting] result: ', result);
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name: 'DataNotFound'});
    if(result && result.isInMeeting == true) 
      return callback && callback({name: 'InMeeting'});
    if(result && result.isReceiveNotification == false) 
      return callback && callback({name: 'ClientOffLine'});
    input.callToUser = {}
    if(result.name) input.callToUser.name = result.name;
    if(result.companyId.displayname) input.callToUser.company = result.companyId.displayname;
    if(result.department) input.callToUser.department = result.department;
    console.log('[checkDoctorInMeeting] input: ', input);
    return callback && callback();
  });
}

function checkMeetingRoomsLimit(companyId, callback){
  let where = {
    'valid': true,
    'companyId': companyId,
    'isInMeeting': true,
    'meetingNumber': {'$nin': [null, "0"]}
  }  
  EmployeeModel.find(where)
  .populate({
    path: 'companyId',
    select: 'outpatientLimit'
  })
  .select('meetingNumber')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result || !result.length) return callback && callback();
    //console.log('[checkMeetingRoomsLimit] result: ', result);
    let rooms = []
    result.forEach((ele) => {
      if(!rooms.includes(ele.meetingNumber))
        rooms.push(ele.meetingNumber);
    });
    //console.log('[checkMeetingRoomsLimit] rooms: ', rooms);
    let outpatientLimit = result[0].companyId.outpatientLimit;
    //console.log('[checkMeetingRoomsLimit] outpatientLimit: ', outpatientLimit);
    if(rooms.length >= outpatientLimit) return callback && callback({name: 'RoomsExceedLimit'});
    return callback && callback();
  });
}

function pushInviteOnlineMessage(bean, user, callback){
  let {input} = bean;
  console.log('[getUser]input: ',input)
  let userId, userCode;
  if(input.patientId) {
    userId = input.patientId
    userCode = 'c'
  }else if(input.doctorId){
    userId = input.doctorId
    userCode = 'e'
  }
  else{
    return callback && callback({name:'DataNotFound'});
  }
	let where = {
    '_id': userId,
    'valid': true
	}
  userModel(userCode).findOne(where)
  .select('-__target -__targetVer -valid -modifyTime -createTime -apnDebugToken -accountId')
  .exec((err, result) => {
		if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log('[getUser]result: ',result)
    let alertMsg = noteUserToOnlineMsg(user.name, result.name)
    let msgData = null;
    if(input.msgData) msgData = input.msgData;
    if(userCode == 'e') pushMessage(input.isDebug, result.apnToken, result.fcmToken, alertMsg, alertMsg, msgData, userCode);
    //callUser(voipTokens, fcmTokens, title, payload, msgData)
    if(userCode == 'c') callUser(input.isDebug, result.voipToken, result.fcmToken, alertMsg, alertMsg, msgData);
		return callback && callback(null);
  });
}
  
function uploadUserPhoto(req, callback){
  console.log('req.body: ', req.body);
  if (req.files && ( req.files.files || req.files.mainFiles)) {
    let filename = req.files.files.originalFilename || path.basename(req.files.files.path);
    console.log('filename:' + filename);
    //copy file to a public directory
    const uuidValue = uuidv4();
    const targetPath = path.join(__dirname, `../public/images/${uuidValue}.png`);
    //let targetPath = 'public/images/' + uuidValue + '.png';
    console.log('targetPath:' + targetPath);
    //copy file
    var stream = fs.createReadStream(req.files.files.path).pipe(fs.createWriteStream(targetPath));

    stream.on('error', function(err) {
      return callback && callback(err);
    });
    stream.on('close', function() {
      console.log('uploadUserPhoto : close');
      let userCode, where;
      if (req.body.doctorId){
        userCode = 'e';
        where = {
          '_id': req.body.doctorId
        }
      }else if (req.body.patientId) {
        userCode = 'c';
        where = {
          '_id': req.body.patientId
        }
      }else{
        return callback && callback({name:'DataNotFound'});
      }
      let updateData = {
        'photoFileName': uuidValue + '.png'
      }
      userModel(userCode).updateOne(where, {'$set': updateData}, (err, result)=>{
        if(err) return callback && callback(err);
        console.log('[uploadUserPhoto]result: ',result)
        return callback && callback(null);
      });
    });
  } else {
    return callback && callback({name:'DataNotFound'});
  }
}

function sendMsgToMeetingMember(bean, callback){
  let {input} = bean;
  //console.log('input: ', input);
  let msg = {}
  let onlineList;
  if(input.msgString) msg.msgString = input.msgString;
  getAllUserOnlineStatus((err, result)=>{
    if(err) return callback && callback(err);
    console.log('onlineList: ', result);
    onlineList = result;
    //onlineList = ['5d22a94d7c9ad06c40b4bbe8', '5d3a560b23474c737cd244c1', '5d3a560b23474c737cd244c3']
    async.map(input.EmployeeList, checkShareOnline, (err, mapResult)=>{
      if (err) return callback && callback(err);
      logger.info('[sendMsgToShare] result:', mapResult);
      if (mapResult.includes('success')){
      return callback && callback(null)
      }else{
        return callback && callback({name: 'ClientOffLine'});
      }
    });
  });
  function checkShareOnline(user, cb){
    console.log('!!!!!!user._id: ', user._id);
    let xmppUser = input.targetRole + user._id;
    if (onlineList.includes(xmppUser)){
      let EVENT =  'sendMsgToMeetingMember/id/' + user._id; 
      xmppSend(xmppUser, EVENT, msg, (result)=>{
        let log = {
          'receiver': xmppUser,
          'event': EVENT,
          'msg': msg
        }
        if(result=='success'){
          logger.info('[XMPP] '+JSON.stringify(log));
          return cb(null, 'success');
        }else{
          logger.info('[XMPP] '+JSON.stringify(log));
          return cb(null, 'XMPPSendErr');
        }
      });
    }else{
      return cb(null, null);
    }
  }
}

function checkVidyoData(bean, callback){
  let {input, output} = bean;
  if (!output.user.currentVidyoPin || output.user.currentVidyoPin=='0') return callback && callback({name: 'NoLiveMeeting'});
  if (output.user.currentVidyoPin) input.vidyoPin = output.user.currentVidyoPin;
  if (output.user.currentVidyoRoomUrl) input.vidyoRoomUrl = output.user.currentVidyoRoomUrl;
  logger.info('[checkVidyoData] '+JSON.stringify(input));
  return callback && callback(null)
}


