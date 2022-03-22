import async from 'async';
import moment from 'moment';
import logger from '../config/log';
//import EmployeeModel from '../models/employeeModel';
import AppointmentModel from '../models/appointmentModel';
import OutpatientModel from '../models/outpatientModel';
import InviteRecordModel from '../models/inviteRecordModel';
import ConsultingAppointmentModel from '../models/consultingAppointmentModel';
import EmployeeModel from '../models/employeeModel';
import OutPatientType from '../models/type/outpatientType';
import AppointmentType from '../models/type/appointmentType';
//import OutPatientType from '../models/type/outPatientType';
//import socketIOUtil from '../utils/socketIOUtil';
import {xmppSend} from '../utils/xmppUtil';
import {judgeOPTimeType} from '../utils/dateUtil';
import RoleType from '../models/type/roleType';
import {addRoomReq, deleteRoomReq, disconnectConferenceAllReq, recordsSearchRequest} from '../utils/vidyoUtil';
import {addUserOnlineStatus, noteNextPatientMsg, pushMessage, decryptString, sortRecordResult, getCallUserMsg} from '../utils/stringUtil';
import {requestZoomCreateMeeting, requestEndZoomMeeting, requestDeleteZoomMeeting, requestGetFilesUrl} from '../utils/httpUtil';
import mongoose from 'mongoose';
//import defaultConf from '../config/defaultConf';

let {Types: {ObjectId}} = mongoose;

const SKIP_JUMP_NUMBER = 3;
const NOTE_NEXT_PATIENT_NUMBER = 2;

export {
  createAppointment, 
  checkRepeatAppointment,
  hospitalSyncCreateAppointment,
  updateAppointment,
  cancelAppointment, 
  hospitalSyncCancelAppointment,
  updateSignupNumberForCancel,

  getAppointmentForPatient,
  getAppointmentList,
  retrieveAppointment,
  getOutpatientRecords,
  getConsultingRecords,
  queryProgress,
  queryRecords,
  getAppointmentStatus,
  //inviteToJoinMeeting,
  inviteToJoinMeetingByVidyo,
  inviteToJoinMeetingByZoom,
  requestLeaveMeeting,
  requestDeleteMeeting,
  updateStatus,
  endAllAppointments,
  getRecordingUrl,

  createConsultingAppointment,
  cancelConsultingAppointment,
  getConsultingAppointment,
};

function createAppointment(bean, callback) {
  let {input, output} = bean;
  let outpatientStartTime, sequenceResult;
  async.series({
    checkOutpatient: (cb)=> {
      let where = {
        'valid': true,
        '_id': input.outpatientId
      };
      OutpatientModel.findOne(where)
      .select('-valid -modifyTime -createTime')
      .exec((err, result) => {
        if(err) return callback && callback(err);
        if(!result) return callback && callback({name: 'OutpatientNotFound'});
        outpatientStartTime = result.startTime;
        cb(null);
      });
    },
    checkRepeatAppointment: (cb)=> {
      let where = {
        'valid': true,
        'outpatientId': input.outpatientId,
        'patientId': input.patientId
      };
      AppointmentModel.find(where)
      .countDocuments()
      .exec((err, result) => {
        if(err) return callback && callback(err);
        if(result) return callback && callback({name: 'RepeatAppointment'});
        cb(null);
      });
    },
    findLatestAppointmentsquence: (cb)=> {
      let where = {
        'valid': true,
        'outpatientId': input.outpatientId
      };
      AppointmentModel.find(where)
      .sort({'createTime': -1})
      //.limit(1)
      .exec((err, result) => {
        console.log('[findLatestAppointmentsquence]: ',result)
        if(err) return callback && callback(err);
        if(!result || !result.length){
          sequenceResult = 0;
        }else{
          sequenceResult = result.length;
        } 
        cb(null);
      });
    },
    saveAppointment: (cb)=> {
      let data = input;
      let number = 1 + sequenceResult;
      data.sequence = number;
      data.sortNumber = number;
      data.expectedStartTime = moment(outpatientStartTime).add(15*sequenceResult, 'm');
      new AppointmentModel(data).save((err, result) => {
        if (err) {
          return callback && callback(err);
        } else if (!result) {
          return callback && callback({name: 'CreateError'});
        } else {
          let data ={
            'appointmentId': result._id
          }
          output.result = data;
          cb(null);
        }
      });
    },
    updateOutpatient: (cb)=> {
      let {input} = bean;
      let where = {
        '_id': input.outpatientId
      }
      let updateData = {
        'signUpNumber': 1 + sequenceResult
      };
      OutpatientModel.update(where, {$set: updateData}, (err, result)=>{
        if (err) return callback && callback(err);
        if (!result) return callback && callback({name: 'UpdateError'});
        console.log('[clientLogin]  result: ', result);
        cb(null);
      });
    },
  }, (err)=> {
    if (err) return callback && callback(err);
    callback && callback(null);
  });
}


function checkRepeatAppointment(bean, callback) {
  let {input} = bean;
  async.series({
    checkRepeatAppointment: (cb)=> {
      let where = {
        'valid': true,
        'outpatientId': input.outpatientId,
        'patientId': input.patientId
      };
      AppointmentModel.find(where)
      .countDocuments()
      .exec((err, result) => {
        if(err) return callback && callback(err);
        if(result) return callback && callback({name: 'RepeatAppointment'});
        cb(null);
      });
    }
  }, (err)=> {
    if (err) return callback && callback(err);
    callback && callback(null);
  });
}

function hospitalSyncCreateAppointment(bean, callback) {
  let {input, output} = bean;
  console.log('[hospitalSyncCreateAppointment]  input: ', input);
  async.series({
    saveAppointment: (cb)=> {
      let data = input;
      let number = input.registerResult.waitNo;
      data.sequence = number;
      data.sortNumber = number;
      data.expectedStartTime = null;
      if(input.registerResult.remark) data.remark = input.registerResult.remark;
      if(input.outpatientData.startTime) data.expectedStartTime = input.outpatientData.startTime;
      if(input.outpatientData.hospSuggestTime)  data.expectedStartTime = input.outpatientData.hospSuggestTime;
      new AppointmentModel(data).save((err, result) => {
        if (err) {
          return callback && callback(err);
        } else if (!result) {
          return callback && callback({name: 'CreateError'});
        } else {
          let data ={
            'appointmentId': result._id
          }
          output.result = data;
          cb(null);
        }
      });
    },
    updateOutpatient: (cb)=> {
      let {input} = bean;
      let where = {
        '_id': input.outpatientId
      }
      let updateData = {
        '$inc': { signUpNumber: 1} 
      };
      OutpatientModel.update(where, updateData, (err, result)=>{
        if (err) return callback && callback(err);
        if (!result) return callback && callback({name: 'UpdateError'});
        console.log('[clientLogin]  result: ', result);
        cb(null);
      });
    },
  }, (err)=> {
    if (err) return callback && callback(err);
    callback && callback(null);
  });
}

function updateAppointment(bean, callback) {
  let {input} = bean;
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }
  let updateData = {};
  updateData.patientPID = input.patientPID;
  if(input.patientQRCodeData) updateData.patientQRCodeData = input.patientQRCodeData
  if(input.VHCToken) {
    updateData.VHCToken = input.VHCToken
    updateData.status = AppointmentType.REGISTERED.value
    updateData.isCheckIn = true;
  }
  AppointmentModel.update(where, {$set: updateData}
  , (err, updateResult) => {
    //console.log('updateResult: ', updateResult);
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    return callback && callback(null);
  });
}

function hospitalSyncCancelAppointment(bean, callback) {
  let {input} = bean;
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }
  let updateData = {
    'valid': false,
    'status': AppointmentType.CANCEL.value,
    'invalidTime': new Date()
  }
  AppointmentModel.update(where, {$set: updateData}
  , (err, updateResult) => {
    console.log('updateResult: ', updateResult);
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    return callback && callback(null);
  });
}

function cancelAppointment(bean, callback) {
  let {input} = bean;
  console.log('[cancelAppointment] input: ', input);
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }
  console.log('[cancelAppointment] where: ', where);
  let updateData = {
    'valid': false,
    'status': AppointmentType.CANCEL.value,
    'invalidTime': new Date()
  }
  AppointmentModel.update(where, {$set: updateData}
  , (err, updateResult) => {
    console.log('updateResult: ', updateResult);
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    return callback && callback(null);
  });
}

function updateSignupNumberForCancel(bean, callback) {
  let {input} = bean;
  console.log('[updateSignupNumberForCancel] input: ', input);
  let where = {
    //'valid': true,
    '_id': input.appointmentId
  }
  console.log('[updateSignupNumberForCancel] where: ', where);
  AppointmentModel.findOne(where)
    .select('outpatientId')
    .exec((err, result) => {
    console.log('result: ', result);
    if (err) return callback(err, null);
    if (!result) return callback && callback({name: 'DataNotFound'});
    let where = {
      '_id': result.outpatientId
    }
    let updateData = {
      '$inc': { signUpNumber: -1} 
    };
    OutpatientModel.update(where, updateData, (err, result)=>{
      if (err) return callback && callback(err);
      if (!result) return callback && callback({name: 'UpdateError'});
      console.log('[updateSignupNumberForCancel]  result: ', result);
      return callback && callback(null);
    });
  });
}

function getAppointmentForPatient(bean, user, callback) {
  let {output} = bean;
  let checkDate = moment().subtract(12, 'h');
  let where = {
    'valid': true,
    'patientId': user._id,
    'status': {'$ne': AppointmentType.END.value},
    //'expectedStartTime': {'$gte': checkDate},
  }; 
  AppointmentModel.find(where)
  .sort({'expectedStartTime': 1})
  .select('-valid -modifyTime -createTime -meetingUUID -meetingRecordId -doctorId -meetingNumber')
  .populate({
    path: 'outpatientId',
    select: '-valid -modifyTime -createTime -consultantIdList -meetingUUID -meetingNumber',
    match: {
      'valid': true,
      'status': {'$ne': OutPatientType.END.value},
      'startTime': {'$gte': checkDate}
    },
    populate: {
      path: 'doctorId',
      select: '_id name companyId email',
      populate: {
        path: 'companyId',
        select: '_id displayname',
      }
    }
  })
  .exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
      let data = {};
      data.appointment = JSON.parse(JSON.stringify(result.filter(result => result.outpatientId != null)));
      data.appointment.forEach((ele) => {
        ele.outpatientId.timeType = judgeOPTimeType(ele.outpatientId.startTime);
        if(!ele.expectedStartTime)  ele.expectedStartTime = ele.outpatientId.startTime;
        if(ele.outpatientId.doctorName && ele.outpatientId.doctorId) ele.outpatientId.doctorId.name = ele.outpatientId.doctorName;
      });
			output.result = data;
			return callback && callback(null);
		}
  });
}

function getAppointmentList(bean, callback) {
  let {input, output} = bean;
  console.log('[getAppointmentList] input: ', input);
  let where = {
    'valid': true,
  }; 
  if(input.outpatientId) where['outpatientId'] = input.outpatientId;
  if(input.patientId) where['patientId'] = input.patientId;
  console.log('[getAppointmentList] where: ', where);
  AppointmentModel.find(where)
  .sort({'sortNumber': 1, 'createTime': 1})
  .select('-valid -modifyTime -createTime -sortNumber -meetingUUID -meetingNumber -meetingRecordId')
  .populate({
    path: 'patientId',
    select: '_id name personalId companyId email isReceiveNotification isInMeeting isConnectNote',
    //match: {'valid': true},
  })
  .exec((err, result) => {
    let data = {};
		if (err) {
			return callback && callback(err);
		} else if (!result || !result.length) {
      data.appointmentList = [];
      output.result = data
      return callback && callback(null);
		} else {
      result.forEach(ele => {
        if(ele.patientId){
          if(ele.patientId.personalId)ele.patientId.personalId = decryptString(ele.patientId.personalId);
          if(ele.patientId.name)ele.patientId.name = decryptString(ele.patientId.name);
        }
      });
      addUserOnlineStatus(result, 'patientId', (err, results)=>{
        if (err) return callback && callback(err);
        data.appointmentList = results;
        output.result = data
        input.appointmentList = results;
        return callback && callback(null);
      });
		}
  });
}

function retrieveAppointment(bean, callback) {
  let {input, output} = bean;
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }; 
  console.log('where: ', where);
  AppointmentModel.findOne(where)
  .select('-valid -modifyTime -createTime -sortNumber -meetingUUID -meetingRecordId')
  .populate({
    path: 'outpatientId',
    select: '-valid -modifyTime -createTime',
    //match: {'valid': true},
    populate: {
      path: 'doctorId',
      select: '_id name companyId',
      populate: {
        path: 'companyId',
        select: '_id displayname isSyncAppointment',
      }
    }
  })
  .exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
      input.appointmentData = result;
      output.result = result;
      if(output.result.outpatientId && output.result.outpatientId.doctorName && output.result.outpatientId.doctorId) output.result.outpatientId.doctorId.name = output.result.outpatientId.doctorName;
      return callback && callback(null);
		}
  });
}

function getOutpatientRecords(bean, user, callback) {
  let {input, output} = bean;
  let queryEndTime = moment(input.queryStartTime).add(input.daysRange, 'days');
  //let companyId = user.companyId;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      //'isAcceptInviteMeeting': true,
      'status' : {'$in':[ AppointmentType.READY.value, AppointmentType.END.value, AppointmentType.SKIP.value, AppointmentType.CANCEL.value, AppointmentType.CONS.value]},
      'modifyTime': {'$gte': moment(input.queryStartTime).toDate(), '$lt': queryEndTime.toDate()}
    }
  });
  // if(moment(input.queryStartTime).isAfter('2020-06-22')){
  //   logger.info('[getConsultingRecords] isAfter! 2020-06-22 user:', user)
  //   aggregateArray.push({
  //     $match:{
  //       'isAcceptInviteMeeting': true,
  //     }
  //   });
  // }
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
      'status': 1,
      'patientPID': 1,
      'patientId._id': 1,
      'patientId.name': 1,
      'patientId.personalId': 1,
      'doctorId._id': 1,
      'doctorId.name': 1,
      'doctorId.department': 1,
      'doctorId.companyId._id': 1,
      'doctorId.companyId.displayname': 1,
      'doctorId.companyId.code': 1,
      'doctorId.companyId.region': 1,
      'consultantDoctorId._id': 1,
      'consultantDoctorId.name': 1,
      'consultantDoctorId.department': 1,
      'consultantDoctorId.companyId._id': 1,
      'consultantDoctorId.companyId.displayname': 1,
      'consultantDoctorId.companyId.region': 1,
      'createTime': '$modifyTime',
      'meetingData': 1,
      'vidyoRoomUrl': 1,
      'vidyoPin': 1,
      'isAcceptInviteMeeting': 1,
    }
  });
  if(input.companyId) {
    aggregateArray.push({
      $match:{
        '$or': [{'doctorId.companyId._id': ObjectId(input.companyId)}, {'consultantDoctorId.companyId._id': ObjectId(input.companyId)}] 
      }
    });  
  }
  if(input.doctorId) {
    aggregateArray.push({
      $match:{
        '$or': [{'doctorId._id': ObjectId(input.doctorId)}, {'consultantDoctorId._id': ObjectId(input.doctorId)}] 
      }
    });   
  }
  aggregateArray.push({
    $group: {
      '_id': '$_id',
      'patientPID': { $first: '$patientPID'},
      'createTime': { $first: '$createTime'},
      'meetingData': { $first: '$meetingData'},
      'vidyoRoomUrl': { $first: '$vidyoRoomUrl'},
      'vidyoPin': { $first: '$vidyoPin'},
      'status': { $first: '$status'},
      'patientId': { $first: '$patientId'},
      'doctorId': { $first: '$doctorId'},
      'consultantDoctorId':{ $push: '$consultantDoctorId'},
      'isAcceptInviteMeeting':{ $first: '$isAcceptInviteMeeting'},
    }
  });
  aggregateArray.push({
    $match: {   
      'doctorId._id': {'$ne': null},
      'patientId._id': {'$ne': null},
    }
  });
  aggregateArray.push({
    $sort: {
      createTime: 1,
    }
  }); 
  AppointmentModel.aggregate(aggregateArray, (err, result)=>{
		if (err) return callback && callback(err);
    //if (!result || !result.length) return callback && callback({name: 'DataNotFound'});
    result.forEach(ele => {
      if(ele.patientId){
        ele.patientId.name = decryptString(ele.patientId.name);
        ele.patientId.personalId = decryptString(ele.patientId.personalId);
      }
    });
    if(output.result && output.result.recordsList){
      console.log('result: ', result);
      output.result.recordsList = output.result.recordsList.concat(result);
    }else{
      let data = {};
      data.recordsList = result;
      output.result = data
    }
    output.result.recordsList = sortRecordResult(output.result.recordsList);
    return callback && callback(null);
  });
}

function getConsultingRecords(bean, user, callback) {
  let {input, output} = bean;
  let queryEndTime = moment(input.queryStartTime).add(input.daysRange, 'days');
  //let companyId = user.companyId;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      //'isAcceptInviteMeeting': true,
      'status' : AppointmentType.CONS.value,
      'createTime': {'$gte': moment(input.queryStartTime).toDate(), '$lt': queryEndTime.toDate()}
    }
  });
  if(moment(input.queryStartTime).isAfter('2020-06-22')){
    logger.info('[getConsultingRecords] isAfter! 2020-06-22 user:', user)
    aggregateArray.push({
      $match:{
        'isAcceptInviteMeeting': true,
      }
    });
  }
  // if(input.companyId) {
  //   aggregateArray.push({
  //     $match:{
  //       'companyId':  ObjectId(input.companyId),
  //     }
  //   });   
  // }
  // if(input.doctorId) {
  //   aggregateArray.push({
  //     $match:{
  //       'doctorId':  ObjectId(input.doctorId),
  //     }
  //   });   
  // }
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
  // if (user.serviceGroupId && user.serviceGroupId.length){
  //   console.log('[getConsultingRecords]  user.serviceGroupId:', user.serviceGroupId)
  //   let objIdArray = []
  //   user.serviceGroupId.map((serviceGroupId)=>{
  //     objIdArray.push(ObjectId(serviceGroupId));
  //   })
  //   aggregateArray.push({
  //     $match:{
  //       'doctorId.serviceGroupId': {'$in': objIdArray}
  //     }
  //   });
  // }
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
      'from': 'ServiceGroup',
      'localField': 'doctorId.serviceGroupId',
      'foreignField': '_id',
      'as': 'doctorId.serviceGroupId',
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
    $lookup: {
      'from': 'ServiceGroup',
      'localField': 'consultantDoctorId.serviceGroupId',
      'foreignField': '_id',
      'as': 'consultantDoctorId.serviceGroupId',
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'status': 1,
      'patientPID': 1,
      'doctorId._id': 1,
      'doctorId.name': 1,
      'doctorId.department': 1,
      'doctorId.serviceGroupId': 1,
      'doctorId.companyId._id': 1,
      'doctorId.companyId.displayname': 1,
      'doctorId.companyId.region': 1,
      'doctorId.companyId.code': 1,
      'consultantDoctorId._id': 1,
      'consultantDoctorId.name': 1,
      'consultantDoctorId.department': 1,
      'consultantDoctorId.serviceGroupId': 1,
      'consultantDoctorId.companyId._id': 1,
      'consultantDoctorId.companyId.displayname': 1,
      'consultantDoctorId.companyId.region': 1,
      'createTime': 1,
      'meetingData': 1,
      'vidyoRoomUrl': 1,
      'vidyoPin': 1,
      'isAcceptInviteMeeting': 1,
    }
  });
  if(input.companyId) {
    aggregateArray.push({
      $match:{
        '$or': [{'doctorId.companyId._id': ObjectId(input.companyId)}, {'consultantDoctorId.companyId._id': ObjectId(input.companyId)}] 
      }
    });  
  }
  if(input.doctorId) {
    aggregateArray.push({
      $match:{
        '$or': [{'doctorId._id': ObjectId(input.doctorId)}, {'consultantDoctorId._id': ObjectId(input.doctorId)}] 
      }
    });   
  }
  aggregateArray.push({
    $group: {
      '_id': '$_id',
      'patientPID': { $first: '$patientPID'},
      'createTime': { $first: '$createTime'},
      'meetingData': { $first: '$meetingData'},
      'vidyoRoomUrl': { $first: '$vidyoRoomUrl'},
      'vidyoPin': { $first: '$vidyoPin'},
      'status': { $first: '$status'},
      'doctorId': { $first: '$doctorId'},
      'consultantDoctorId':{ $push: '$consultantDoctorId'},
      'isAcceptInviteMeeting':{ $first: '$isAcceptInviteMeeting'},
    }
  });
  aggregateArray.push({
    $match: {   
      'doctorId._id': {'$ne': null},
    }
  });
  aggregateArray.push({
    $sort: {
      createTime: 1,
    }
  }); 
  AppointmentModel.aggregate(aggregateArray, (err, result)=>{
		if (err) return callback && callback(err);
    //if (!result || !result.length) return callback && callback({name: 'DataNotFound'});
    //console.log('result: ', result);
    let data = {};
    data.recordsList = result;
    output.result = data
    return callback && callback(null);
  });
}

// function TestgetConsultingRecords(bean, user, callback) {
//   let {input, output} = bean;
//   let queryEndTime = moment(input.queryStartTime).add(input.daysRange, 'days');
//   let where = {
//     'valid': true,
//     'status' : AppointmentType.CONS.value,
//     'createTime': {'$gte': moment(input.queryStartTime), '$lt': queryEndTime}
//   }; 
//   let companyId = user.companyId;
//   if(input.companyId) companyId = input.companyId;
//   if(input.doctorId) where['doctorId'] = input.doctorId;
//   AppointmentModel.find(where)
//   .sort({'createTime': 1})
//   .select('-valid -modifyTime -meetingUUID -meetingNumber -meetingRecordId')
//   .populate({
//     path: 'doctorId',
//     select: '_id name department companyId email',
//     match: {'companyId': companyId},
//     populate: {
//       path: 'companyId',
//       select: '_id displayname region',
//     }
//   })
//   .populate({
//     path: 'consultantDoctorId',
//     select: '_id name department companyId email',
//     populate: {
//       path: 'companyId',
//       select: '_id displayname region',
//     }
//   })
//   .exec((err, result) => {
// 		if (err) return callback && callback(err);
//     if (!result || !result.length) return callback && callback({name: 'DataNotFound'});
//     let data = {};
//     data.recordsList = result.filter(result => result.doctorId != null);
//     output.result = data
//     return callback && callback(null);
//   });
// }

function queryProgress(bean, callback) {
  let {input, output} = bean;
  let where = {
    'valid': true,
    'outpatientId': input.outpatientId,
    'status': {'$ne': AppointmentType.END.value},
  }; 
  AppointmentModel.find(where)
  .sort({'sortNumber': 1, 'createTime': 1})
  .select('-valid -modifyTime -createTime')
  .exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result || !result.length) {
			return callback && callback({name: 'DataNotFound'});
		} else {
      let data = {};
      data.nowNumber = null;
      data.nextNumber = null;
      if(result[0] && result[0].sequence) data.nowNumber = result[0].sequence;
      if(result[1] && result[1].sequence) data.nextNumber = result[1].sequence;
      output.result = data;
      return callback && callback(null);
		}
  });
}

function queryRecords(bean, user, callback) {
  let {output} = bean;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      'patientId': ObjectId(user._id)
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
    $project: {
      '_id': 0,
      'doctorId': '$doctorId._id',
      'companyId': '$doctorId.companyId',
      'doctorName': {$ifNull: ["$outpatientId.doctorName", '$doctorId.name']},//'$doctorId.name',
      'department': '$doctorId.department',
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
    $group: {
      '_id':{
        companyName:'$companyId.displayname',
        companyId:'$companyId._id'
      },
      'doctorList':{
        $addToSet: {
          'doctorId': '$doctorId',
          'department': '$department',
          'doctorName': '$doctorName'
        }
      },
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'companyId': '$_id.companyId',
      'companyName': '$_id.companyName',
      'doctorList': 1
    }
  });
  AppointmentModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log('result: ', result);
    output.result = result;
    callback && callback(null);
  });
}

function getAppointmentStatus(bean, callback) {
  let {output} = bean;
  let data = {};
  data.appointmentStatusList = AppointmentType.toOutput()
  output.result = data;
  return callback && callback(null);
}

// function inviteToJoinMeetingByVidyo(bean, user, callback){
//   console.log('[inviteToJoinMeetingByVidyo] user: ', user);
//   let {input, output} = bean;
//   if(input.vidyoHost&&input.vidyoToken&&input.vidyoResourceId&&input.userId){  //診間中邀請會診醫生
//     const EVENT =  'inviteToJoinMeeting/id/' + input.userId ; 
//     let msg = {
//       'vidyoHost': input.vidyoHost,
//       'vidyoToken': input.vidyoToken,
//       'vidyoResourceId': input.vidyoResourceId,
//     }
//     if(user.name) msg.name = user.name;
//     if(user.department) msg.department = user.department;
//     if (input.consultationPatientId) msg.consultationPatientId = input.consultationPatientId;
//     let updateData = {
//       'consultantDoctorId': input.userId
//     }
//     AppointmentModel.update({'vidyoResourceId': input.vidyoResourceId, 'valid': true},
//     {$addToSet: updateData}, (err, updateResult) => {
//       if(err) logger.info('[inviteToJoinMeeting] err: ', err);
//       console.log('[inviteToJoinMeeting] updateResult: ', updateResult);
//     });
//     input.doctorId = input.userId;
//     input.msgData = msg;
//     input.msgData.event = 'inviteToJoinMeeting';
//     socketIOUtil.send(input.userId, EVENT, msg, (result)=>{
//       if(result=='success'){
//         saveInviteRecord(user._id, input.userId, null, null, input.vidyoResourceId);
//         return callback && callback(null);
//       }else{
//         return callback && callback({name: 'ClientOffLine'});
//       }
//     });
//   }else if(input.userId){  //無門診情況下直接邀請會診醫生 
//     generateToken(input.vidyoConfig, (err, result)=>{
//       if (err)  return callback && callback(err);
//       if(!result) return callback && callback({name: 'VidyoErr'});
//       const EVENT =  'inviteToJoinMeeting/id/' + input.userId ; 
//       let saveData = {
//         'vidyoToken': result.vidyoToken,
//         'vidyoHost': input.vidyoConfig.VIDYO_HOST,
//         'vidyoResourceId': result.vidyoResourceId,
//         'doctorId': user._id,
//         'consultantDoctorId': input.userId,
//         'status': AppointmentType.CONS.value
//       }
//       new AppointmentModel(saveData).save((err, saveResult) => {
//         if (err) return callback && callback(err);
//         let msg = {
//           'appointmentId': saveResult._id,
//           'vidyoHost': input.vidyoConfig.VIDYO_HOST,
//           'vidyoToken': result.vidyoToken,
//           'vidyoResourceId': result.vidyoResourceId,
//         }
//         if(user.name) msg.name = user.name;
//         if(user.department) msg.department = user.department;
//         input.doctorId = input.userId;
//         input.msgData = msg;
//         input.msgData.event = 'inviteToJoinMeeting';
//         socketIOUtil.send(input.userId, EVENT, msg, (result)=>{
//           if(result=='success'){
//             saveInviteRecord(user._id, input.userId, null, null, msg.vidyoResourceId);
//             output.result = msg;
//             return callback && callback(null);
//           }else{
//             return callback && callback({name: 'ClientOffLine'});
//           }
//         });
//       });
//     }); 
//   }else if(input.appointmentId) {  //邀請病人看診
//     generateToken(input.vidyoConfig, (err, result)=>{
//       if (err) return callback && callback(err);
//       if(!result) return callback && callback({name: 'ZoomErr'});
//       let updateData = {
//         'vidyoHost': input.vidyoConfig.VIDYO_HOST,
//         'vidyoToken': result.vidyoToken,
//         'vidyoResourceId': result.vidyoResourceId,
//         'status': AppointmentType.READY.value
//       }
//       AppointmentModel.findOneAndUpdate({'_id': input.appointmentId, 'valid': true},
//       updateData, (err, updateResult) => {
//         if (err) return callback && callback(err);
//         if(!updateResult) return callback && callback({name: 'DataNotFound'});
//         //console.log('[inviteToJoinMeeting] updateResult:', updateResult);
//         const EVENT =  'inviteToJoinMeeting/id/' + updateResult.patientId ; 
//         let msg = {
//           'vidyoHost': input.vidyoConfig.VIDYO_HOST,
//           'vidyoToken': result.vidyoToken,
//           'vidyoResourceId': result.vidyoResourceId
//         }
//         if(user.name) msg.name = user.name;
//         if(user.department) msg.department = user.department;
//         input.patientId = updateResult.patientId;
//         input.msgData = msg;
//         input.msgData.event = 'inviteToJoinMeeting';
//         socketIOUtil.send(updateResult.patientId, EVENT, msg, (result)=>{
//           //console.log('[inviteToJoinMeeting] result:', result);
//           if(result=='success'){
//             saveInviteRecord(user._id, input.userId, null, null, msg.vidyoResourceId);
//             //delete msg.zoomConfig;
//             output.result = msg;
//             return callback && callback(null);
//           }else{
//             return callback && callback({name: 'ClientOffLine'});
//           }
//         });
//         if(updateResult.outpatientId && updateResult.sortNumber){
//           noteNextPatient(updateResult.outpatientId, updateResult.sortNumber);
//         }
//       });  
//     });    
//   }else{
//     return callback && callback({name: 'ParamMalformedError'});
//   }
// }

function inviteToJoinMeetingByVidyo(bean, user, callback){
  console.log('[inviteToJoinMeetingByVidyo] user: ', user);
  let {input, output} = bean;
  if(input.vidyoRoomUrl&&input.vidyoPin&&input.userId){  //1)診間中邀請會診醫生
    const EVENT =  'inviteToJoinMeeting/id/' + input.userId ; 
    let msg = {
      'vidyoRoomUrl': input.vidyoRoomUrl,
      'vidyoPin': input.vidyoPin
    }
    if(user.name) msg.name = user.name;
    if(user.department) msg.department = user.department;
    if (input.consultationPatientId) msg.consultationPatientId = input.consultationPatientId;
    let updateData = {
      'consultantDoctorId': input.userId
    }
    AppointmentModel.update({'vidyoRoomUrl': input.vidyoRoomUrl, 'vidyoPin': input.vidyoPin, 'valid': true},
    {$addToSet: updateData}, (err, updateResult) => {
      if(err) logger.info('[inviteToJoinMeeting] err: ', err);
      console.log('[inviteToJoinMeeting] updateResult: ', updateResult);
    });
    input.doctorId = input.userId;
    input.msgData = msg;
    input.msgData.event = 'inviteToJoinMeeting';
    xmppSend(input.userId, EVENT, msg, (result)=>{
      if(result=='success'){
        saveInviteRecord(user._id, input.userId, null, null, input.vidyoRoomUrl, input.vidyoPin);
        return callback && callback(null);
      }else{
        return callback && callback({name: 'ClientOffLine'});
      }
    });
  }else if(input.userId){  //2)無門診情況下直接邀請會診醫生 
    let saveData = {
      'doctorId': user._id,
      'consultantDoctorId': input.userId,
      'status': AppointmentType.CONS.value
    }
    new AppointmentModel(saveData).save((err, saveResult) => {
      if (err) return callback && callback(err);
      addRoomReq(user, input.callToUser.name, saveResult._id, (err, result)=>{
        if(err)  return callback && callback(err);
        if(!result) return callback && callback({name: 'VidyoErr'});
        const EVENT =  'inviteToJoinMeeting/id/' + input.userId ; 
        let updateData = {
          'vidyoRoomUrl': result.vidyoRoomUrl,
          'vidyoPin': result.vidyoPin,
          'vidyoRoomID': result.vidyoRoomID
        }
        AppointmentModel.findOneAndUpdate({'_id': saveResult._id, 'valid': true},
        updateData, (err, updateResult) => {
          if (err) return callback && callback(err);
          if(!updateResult) return callback && callback({name: 'DataNotFound'});
          let msg = {
            'appointmentId': saveResult._id,
            'vidyoRoomUrl': result.vidyoRoomUrl,
            'vidyoPin': result.vidyoPin,
            'vidyoRoomID': result.vidyoRoomID,
          }
          if(user.name) msg.name = user.name;
          if(user.department) msg.department = user.department;
          input.doctorId = input.userId;
          input.msgData = msg;
          input.msgData.event = 'inviteToJoinMeeting';
          xmppSend(input.userId, EVENT, msg, (result)=>{
            if(result=='success'){
              saveInviteRecord(user._id, input.userId, null, null, msg.vidyoRoomUrl, msg.vidyoPin);
              output.result = msg;
              return callback && callback(null);
            }else{
              return callback && callback({name: 'ClientOffLine'});
            }
          });
        });
      }); 
    });
  }else if(input.appointmentId && !input.isPushInviteMsg) {  //3)邀請病人看診
    addRoomReq(user, input.callToUser.name, input.appointmentId, (err, result)=>{
      if (err) return callback && callback(err);
      if(!result) return callback && callback({name: 'VidyoErr'});
      let updateData = {
        'vidyoRoomUrl': result.vidyoRoomUrl,
        'vidyoPin': result.vidyoPin,
        'vidyoRoomID': result.vidyoRoomID,
        'status': AppointmentType.READY.value
      }
      AppointmentModel.findOneAndUpdate({'_id': input.appointmentId, 'valid': true},
      updateData, (err, updateResult) => {
        if (err) return callback && callback(err);
        if(!updateResult) return callback && callback({name: 'DataNotFound'});
        //console.log('[inviteToJoinMeeting] updateResult:', updateResult);
        const EVENT =  'inviteToJoinMeeting/id/' + updateResult.patientId ; 
        let msg = {
          'vidyoRoomUrl': result.vidyoRoomUrl,
          'vidyoPin': result.vidyoPin,
          'vidyoRoomID': result.vidyoRoomID,
        }
        if(user.hospital) msg.hospital = user.hospital;
        if(user.name) msg.name = user.name;
        if(user.department) msg.department = user.department;
        input.patientId = updateResult.patientId;
        input.msgData = msg;
        input.msgData.event = 'inviteToJoinMeeting';
        xmppSend(updateResult.patientId, EVENT, msg, (result)=>{
          //console.log('[inviteToJoinMeeting] result:', result);
          if(result=='success'){
            saveInviteRecord(user._id, null, updateResult.patientId, null, msg.vidyoRoomUrl, msg.vidyoPin);
            //delete msg.zoomConfig;
            output.result = msg;
            return callback && callback(null);
          }else{
            return callback && callback({name: 'ClientOffLine'});
          }
        });
        if(updateResult.outpatientId && updateResult.sortNumber){
          noteNextPatient(updateResult.outpatientId, updateResult.sortNumber);
        }
      });  
    });    
  }else if(input.appointmentId && input.isPushInviteMsg && input.patientId) {  //4)推播邀請病人看診
    console.log('================  (4)推播邀請病人看診 ====================');
    //console.log('[inviteToJoinMeeting] appointmentData:', input.appointmentData);
    addRoomReq(user, 'callToUser', input.appointmentId, (err, result)=>{
      if (err) return callback && callback(err);
      if(!result) return callback && callback({name: 'VidyoErr'});
      let updateData = {
        'vidyoRoomUrl': result.vidyoRoomUrl,
        'vidyoPin': result.vidyoPin,
        'vidyoRoomID': result.vidyoRoomID,
        'status': AppointmentType.READY.value
      }
      AppointmentModel.findOneAndUpdate({'_id': input.appointmentId, 'valid': true},
      updateData, (err, updateResult) => {
        if (err) return callback && callback(err);
        if(!updateResult) return callback && callback({name: 'DataNotFound'});
        //console.log('[inviteToJoinMeeting] updateResult:', updateResult);
        //const EVENT =  'inviteToJoinMeeting/id/' + updateResult.patientId ; 
        let msg = {
          'vidyoRoomUrl': result.vidyoRoomUrl,
          'vidyoPin': result.vidyoPin,
          'vidyoRoomID': result.vidyoRoomID,
        }
        msg.name = getCallUserMsg(input.appointmentData.outpatientId);
        if(user.department) msg.department = user.department;
        input.patientId = updateResult.patientId;
        input.msgData = msg;
        input.msgData.event = 'inviteToJoinMeeting';
        if(updateResult.outpatientId && updateResult.sortNumber){
          noteNextPatient(updateResult.outpatientId, updateResult.sortNumber);
        }
        saveInviteRecord(user._id, null, updateResult.patientId, null, msg.vidyoRoomUrl, msg.vidyoPin);
        output.result = msg;
        return callback && callback(null);
      });  
    });    
  }else{
    return callback && callback({name: 'ParamMalformedError'});
  }
}

function inviteToJoinMeetingByZoom(bean, user, callback){
  console.log('[inviteToJoinMeetingByZoom] user: ', user);
  let {input, output} = bean;
  if(input.meetingNumber && input.userId){  //診間中邀請會診醫生
    const EVENT =  'inviteToJoinMeeting/id/' + input.userId ; 
    let msg = {
      'meetingNumber': String(input.meetingNumber),
    }
    if(user.name) msg.name = user.name;
    if(user.department) msg.department = user.department;
    if (input.consultationPatientId) msg.consultationPatientId = input.consultationPatientId;
    let updateData = {
      'consultantDoctorId': input.userId
    }
    AppointmentModel.update({'meetingNumber': String(input.meetingNumber), 'valid': true},
    {$addToSet: updateData}, (err, updateResult) => {
      if(err) logger.info('[inviteToJoinMeeting] err: ', err);
      console.log('[inviteToJoinMeeting] updateResult: ', updateResult);
    });
    input.doctorId = input.userId;
    input.msgData = msg;
    input.msgData.event = 'inviteToJoinMeeting';
    xmppSend(input.userId, EVENT, msg, (result)=>{
      if(result=='success'){
        saveInviteRecord(user._id, input.userId, null, input.meetingNumber, null, null);
        return callback && callback(null);
      }else{
        return callback && callback({name: 'ClientOffLine'});
      }
    });
  }else if(input.userId){  //無門診情況下直接邀請會診醫生
    requestZoomCreateMeeting(user, input.zoomConfig, (err, result) => {
      if (err)  return callback && callback(err);
      if(!result) return callback && callback({name: 'ZoomErr'});
      const EVENT =  'inviteToJoinMeeting/id/' + input.userId ; 
      let saveData = {
        'meetingNumber': String(result.id),
        'meetingData': result.meetingData,
        'meetingUUID': result.uuid,
        'doctorId': user._id,
        'consultantDoctorId': input.userId,
        'status': AppointmentType.CONS.value
      }
      new AppointmentModel(saveData).save((err, saveResult) => {
        if (err) return callback && callback(err);
        let msg = {
          'appointmentId': saveResult._id,
          'meetingNumber': String(result.id)
        }
        if(user.name) msg.name = user.name;
        if(user.department) msg.department = user.department;
        input.doctorId = input.userId;
        input.msgData = msg;
        input.msgData.event = 'inviteToJoinMeeting';
        xmppSend(input.userId, EVENT, msg, (result)=>{
          if(result=='success'){
            saveInviteRecord(user._id, input.userId, null, msg.meetingNumber, null, null);
            output.result = msg;
            return callback && callback(null);
          }else{
            return callback && callback({name: 'ClientOffLine'});
          }
        });
      });
    }); 
  }else if(input.appointmentId) {  //邀請病人看診
    requestZoomCreateMeeting(user, input.zoomConfig, (err, result) => {
      if (err) return callback && callback(err);
      if(!result) return callback && callback({name: 'ZoomErr'});
      let updateData = {
        'meetingNumber': String(result.id),
        '$addToSet': {'meetingUUID': result.uuid, 'meetingData': result.meetingData},
        'status': AppointmentType.READY.value
      }
      AppointmentModel.findOneAndUpdate({'_id': input.appointmentId, 'valid': true},
      updateData, (err, updateResult) => {
        if (err) return callback && callback(err);
        if(!updateResult) return callback && callback({name: 'DataNotFound'});
        //console.log('[inviteToJoinMeeting] updateResult:', updateResult);
        const EVENT =  'inviteToJoinMeeting/id/' + updateResult.patientId ; 
        let msg = {
          'meetingNumber': String(result.id),
          'zoomConfig': result.zoomConfig
        }
        if(user.name) msg.name = user.name;
        if(user.department) msg.department = user.department;
        input.patientId = updateResult.patientId;
        input.msgData = msg;
        input.msgData.event = 'inviteToJoinMeeting';
        xmppSend(updateResult.patientId, EVENT, msg, (result)=>{
          if(result=='success'){
            saveInviteRecord(user._id, null, updateResult.patientId, msg.meetingNumber, null, null);
            //delete msg.zoomConfig;
            output.result = msg;
            return callback && callback(null);
          }else{
            return callback && callback({name: 'ClientOffLine'});
          }
        });
        if(updateResult.outpatientId && updateResult.sortNumber){
          noteNextPatient(updateResult.outpatientId, updateResult.sortNumber);
        }
      });  
    });    
  }else{
    return callback && callback({name: 'ParamMalformedError'});
  }
}

function noteNextPatient(outpatientId, nowSortNumber){
  let where = {
    'valid': true,
    'sortNumber': {'$gte': nowSortNumber + NOTE_NEXT_PATIENT_NUMBER},
    'outpatientId': outpatientId,
  }; 
  AppointmentModel.find(where)
  .sort({'sortNumber': 1, 'createTime': 1})
  .limit(1)
  .select('-valid -modifyTime -meetingUUID -meetingNumber')
  .populate({
    path: 'patientId',
    select: '_id name personalId companyId email isReceiveNotification isInMeeting apnToken fcmToken',
    match: {'valid': true},
  })
  .populate({
    path: 'outpatientId',
    match: {'valid': true},
    populate: {
      path: 'doctorId',
      select: '_id name companyId email',
      populate: {
        path: 'companyId',
        select: '_id displayname',
      }
    }
  })
  .exec((err, result) => {
    if (err) return logger.info('[noteNextPatient] err: ', err);
    result = result[0]
    if (!result || !result.patientId) return logger.info('[noteNextPatient] No appointment data!');
    if(result.patientId){
      if(result.patientId.personalId)result.patientId.personalId = decryptString(result.patientId.personalId);
      if(result.patientId.name)result.patientId.name = decryptString(result.patientId.name);
    }
    console.log('[noteNextPatient] result: ', result);
    if ((!result.patientId.apnToken || !result.patientId.apnToken.length) &&
    (!result.patientId.fcmToken || !result.patientId.fcmToken.length)) return logger.info('[noteNextPatient] No apnToken!');
    let msg = noteNextPatientMsg(NOTE_NEXT_PATIENT_NUMBER, result.patientId, result.outpatientId);
    console.log('[noteNextPatient] msg: ', msg);
    //let payload = {"msg":"Rico test payload"}
    //apnSend(true, result.patientId.apnToken, msg, payload, ()=>{});
    pushMessage(true, result.patientId.apnToken, result.patientId.fcmToken, msg, msg, null, 'c');
    return 1;
  });
}

function saveInviteRecord(launchId, invitedDoctorId, invitedPatientId, meetingNumber, vidyoRoomUrl, vidyoPin){
  let saveData = {
    'launchDoctorId': launchId
  };
  if (meetingNumber) saveData.meetingNumber = meetingNumber;
  if (vidyoRoomUrl) saveData.vidyoRoomUrl = vidyoRoomUrl;
  if (vidyoPin) saveData.vidyoPin = vidyoPin;
  if (invitedDoctorId) saveData.invitedDoctorId = invitedDoctorId;
  if (invitedPatientId) saveData.invitedPatientId = invitedPatientId;
  new InviteRecordModel(saveData).save((err, result) => {
    if (err) return logger.info('[saveConsultationInviteRecord] save err: ', err);
    if (!result) return console.log('[saveConsultationInviteRecord] No save.');
    console.log('[saveConsultationInviteRecord] Save OK!!');
  });    
}

function requestLeaveMeeting(bean, user, callback){
  let {input} = bean;
  if (user.meetingSystem == "vidyo"){
    if(input.appointmentData && input.appointmentData.vidyoRoomID) input.vidyoRoomID = input.appointmentData.vidyoRoomID;
    disconnectConferenceAllReq(input.vidyoRoomID, (err, result)=>{
      if(err) return callback && callback(err);
      if(!result) return callback && callback({name:'VidyoErr'});
      if(result.Body.disconnectConferenceAllResponse.OK == 'OK'){
        return callback && callback(null);
      }else{
        return callback && callback({name:'VidyoErr'});
      }
    });
  }else{
    async.series({
      endMeetingRoom: (cb)=> {
        requestEndZoomMeeting(input.zoomConfig, input.meetingNumber,()=>{
          //if(err) return callback && callback(err);
          // if(result) {
          //   logger.info('[requestEndZoomMeeting] Zoom Err: ', result);
          //   return callback && callback({name: 'ZoomErr'});
          // }
          cb(null);
        });
      },
      // sendSocket: (cb)=> {
      //   const EVENT = 'meetingNumber/'+ input.meetingNumber; 
      //   let msg = {
      //     'event': 'kickOutMeeting',
      //   }
      //   console.log('[requestLeaveMeeting]EVENT: ', EVENT);
      //   socketIOUtil.sendAll(EVENT, msg, (result)=>{
      //     if(result=='success'){
      //       return cb(null);
      //     }else{
      //       return callback && callback({name: 'ClientOffLine'});
      //     }
      //   });
      // },
      sendCancelCallingSocket: (cb)=> {
        console.log('[sendCancelCallingSocket]input: ', input);
        let where = {
          'valid': true,
          '_id': input.appointmentId
        };
        AppointmentModel.findOne(where)
        .select('consultantDoctorId')
        .exec((err, result) => {
          if(err) return callback && callback(err);
          if(result && result.consultantDoctorId && result.consultantDoctorId.length){
            result.consultantDoctorId.forEach(userId => {
              const EVENT =  'cancelCalling/id/' + userId; 
              let msg = {
                'meetingNumber': input.meetingNumber
              }
              xmppSend(userId, EVENT, msg, (result)=>{
                if(result=='success'){
                  console.log('[sendCancelCallingSocket] success!, userId: ', userId);
                }else{
                  console.log('[sendCancelCallingSocket] err!, userId: ', userId);
                }
              });
            });
          }
          cb(null);
        });
      }
    }, (err)=> {
      if (err) return callback && callback(err);
      callback && callback(null);
    });
  }
}

function requestDeleteMeeting(bean, user, callback){
  let {input} = bean;
  if (user.meetingSystem == "vidyo"){
    if(input.appointmentData && input.appointmentData.vidyoRoomID) input.vidyoRoomID = input.appointmentData.vidyoRoomID;
    deleteRoomReq(input.vidyoRoomID, (err, result)=>{
      if(err) return callback && callback(err);
      logger.info('[requestDeleteZoomMeeting] result: ', result);
      return callback && callback(null);
    });
  }else{
    requestDeleteZoomMeeting(input.zoomConfig, input.meetingNumber,(err, result)=>{
      if(err) return callback && callback(err);
      if(result) {
        logger.info('[requestDeleteZoomMeeting] Zoom Err: ', result);
        //return callback && callback({name: 'ZoomErr'});
      }
      return callback && callback(null);
    });
  }
}

function updateStatus(bean, callback){
  let {input} = bean;
  console.log('input: ', input);
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }
  if(input.status == AppointmentType.CONS.value) return callback && callback(null);
  if(input.status == AppointmentType.SKIP.value){
    let sortNumber, outpatientId;
    async.series({
      findTheSortNumber: (cb)=> {
        AppointmentModel.findOne(where).exec((err, result) => {
          if(err) return callback && callback(err);
          if(!result) return callback && callback({name: 'DataNotFound'});
          console.log('[findTheSortNumber] result: ', result);
          if (result.meetingNumber) input.meetingNumber = result.meetingNumber;
          if (result.vidyoRoomUrl) input.vidyoRoomUrl = result.vidyoRoomUrl;
          if (result.vidyoRoomID) input.vidyoRoomID = result.vidyoRoomID;
          outpatientId = result.outpatientId;
          sortNumber = result.sortNumber + SKIP_JUMP_NUMBER + 1;
          cb();
        });
      },
      shiftSortNumber: (cb)=> {
        let shiftWhere = {
          'valid': true,
          'outpatientId': ObjectId(outpatientId),
          'sortNumber': {'$gte': sortNumber}
        }
        let updateData = {
          '$inc': { sortNumber: 1 } 
        }
        AppointmentModel.updateMany(shiftWhere, updateData
        , (err, result) => {
          console.log('result: ', result);
          if (err) return callback(err, null);
          if (!result) return callback && callback({name: 'DataNotFound'});
          cb();
        }); 
      },
      jumpSortNumber: (cb)=> {
        let updateData = {
          'status': input.status,
          'sortNumber': sortNumber,
        }
        AppointmentModel.findOneAndUpdate(where, updateData, (err, updateResult) => {
          console.log('updateResult!!!: ', updateResult);
          if(err) return callback && callback(err);
          if(!updateResult) return callback && callback({name: 'DataNotFound'});
          if (updateResult.patientId) input.patientId = updateResult.patientId;
          cb();
        });  
      },
    }, (err)=> {
      if (err) return callback && callback(err);
      callback && callback(null);
    });
  }else{
    let updateData = {
      'status': input.status
    }
    console.log('where!!!: ', where);
    if(input.status == AppointmentType.REGISTERED.value) updateData.isCheckIn = true;
    AppointmentModel.findOneAndUpdate(where, updateData, (err, updateResult) => {
      console.log('updateResult!!!: ', updateResult);
      if (err) return callback(err, null);
      if (!updateResult) return callback && callback({name: 'DataNotFound'});
      if (updateResult.patientId) input.patientId = updateResult.patientId;
      if (updateResult.meetingNumber) input.meetingNumber = updateResult.meetingNumber;
      if (updateResult.vidyoRoomUrl) input.vidyoRoomUrl = updateResult.vidyoRoomUrl;
      if (updateResult.vidyoRoomID) input.vidyoRoomID = updateResult.vidyoRoomID;
      return callback && callback(null);
    });  
  }
}

function endAllAppointments(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true,
    'outpatientId': input.outpatientId
  }
  let updateData = {
    'status': AppointmentType.END.value
  }
  AppointmentModel.updateMany(where, {$set: updateData}
  , (err, updateResult) => {
    console.log('updateResult: ', updateResult);
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    return callback && callback(null);
  }); 
}

function getRecordingUrl(bean, user, callback){
  let {input, output} = bean;
  if (user.meetingSystem == "vidyo"){
    recordsSearchRequest(input.appointmentId, (err, result)=>{
      if(err) return callback && callback(err);
      //console.log(result)
      output.result = result;
      callback && callback(null);
    });
  }else{
    requestGetFilesUrl(input.meetingNumber, input.startTime,(err, result)=>{
      if(err) return callback && callback(err);
      output.result = result.data;
      callback && callback(null);
    });
  }
}

function createConsultingAppointment(bean, callback) {
  let {input} = bean;
  console.log("createConsultingAppointment: ", input);
  if(!input.companyList || !input.companyList.length) return callback && callback({name: 'ParamMalformedError'});
  let where = {
    'valid': true,
    'role': RoleType.employee.DOCTOR.value,
  }
  if(input.doctorId) {
    where._id = input.doctorId
  }else if(input.departmentCode && input.companyList[input.companyList.length - 1]){
    where.departmentCode = input.departmentCode;
    where.companyId = input.companyList[input.companyList.length - 1]._id
  }else{
    return callback && callback({name: 'ParamMalformedError'});
  }
  console.log('where: ', where);
  EmployeeModel.findOne(where)
  .select(' -__target -__targetVer -apnToken -fcmToken -apnDebugToken -code -isReceiveNotification -isInMeeting -valid')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log(result);
    input.doctorId = result._id;
    if(result.companyId) input.companyId = result.companyId;
    new ConsultingAppointmentModel(input).save((err, result) => {
      if (err) 	return callback && callback(err);
      if (!result) return callback && callback({name: 'CreateError'});
      return callback && callback(null);
    });
  });
}

function cancelConsultingAppointment(bean, callback) {
  let {input} = bean;
  if(!input.companyList || !input.companyList.length) return callback && callback({name: 'ParamMalformedError'});
  if(!input.doctorId && !input.departmentCode) return callback && callback({name: 'ParamMalformedError'});
  if(!input.patientId && !input.patientPID) return callback && callback({name: 'ParamMalformedError'});
  console.log(input);
  let where = {
    'valid': true,
  }
  if(input.doctorId) {
    where._id = input.doctorId
  }else if(input.departmentCode && input.companyList[input.companyList.length - 1]){
    where.departmentCode = input.departmentCode;
    where.companyId = input.companyList[input.companyList.length - 1]._id
  }else{
    return callback && callback({name: 'ParamMalformedError'});
  }
  EmployeeModel.findOne(where)
  .select(' -__target -__targetVer -apnToken -fcmToken -apnDebugToken -code -isReceiveNotification -isInMeeting -valid')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    console.log(result);
    let where = {
      'valid': true,
      'appointmentDate': input.appointmentDate,
      'doctorId': result._id,
    }
    if(input.patientId) where.patientId = input.patientId;
    if(input.patientPID) where.patientPID = input.patientPID;
    if(input.room) where.room = input.room;
    if(input.mrno) where.mrno = input.mrno;
    console.log('where: ', where);
    let updateData = {};
    updateData.valid = false;
    ConsultingAppointmentModel.updateOne(where, {$set: updateData}
    , (err, updateResult) => {
      console.log('updateResult: ', updateResult);
      if (err) return callback(err, null);
      if (!updateResult) return callback && callback({name: 'DataNotFound'});
      return callback && callback(null);
    });
  });
}

function getConsultingAppointment(bean, callback){
  let {input, output} = bean;
  let endOfDate = moment(input.appointmentDate).endOf('day');
  console.log(endOfDate.format('YYYY-MM-DDTHH:mm:ss.SSS'));
  let where = {
    'valid': true,
    //'appointmentDate': {'$gte': moment(input.appointmentDate).startOf('day'), '$lte': moment(input.appointmentDate).endOf('day')}, 
  }
  if (input.appointmentDate) where.appointmentDate =  {'$gte': moment(input.appointmentDate).startOf('day'), '$lte': moment(input.appointmentDate).endOf('day')};
  if (input.patientPID) where.patientPID = input.patientPID;
  if (input.companyId) where.companyId = input.companyId;
  if (input.doctorId) where.doctorId = input.doctorId;
  if (input.kmuh_hospital) where.kmuh_hospital = input.kmuh_hospital;
  if (input.kmuh_deptCode) where.kmuh_deptCode = input.kmuh_deptCode;
  if (input.kmuh_doctorId) where.kmuh_doctorId = input.kmuh_doctorId;
  if (input.kmuh_noonNo) where.kmuh_noonNo = input.kmuh_noonNo;
  if (input.room) where.room = input.room;
  if (input.mrno) where.mrno = input.mrno;
  ConsultingAppointmentModel.find(where)
  .select(' -__target -__targetVer -valid')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    input.patientList = result;
    output.result = result;
    callback && callback(null);
  });
}

// export function chome(bean, callback){
//   let {input} = bean;
//   console.log('socketIOUtil!!!!!');
//   const EVENT =  'chome/id/' + input.userId ; 
//   let msg = {
//     'meetingNumber': input.meetingNumber
//   }
//   if (input.consultationPatientId) msg.consultationPatientId = input.consultationPatientId;
//   socketIOUtil.send(input.userId, EVENT, msg, (result)=>{
//     if(result=='success'){
//       return callback && callback(null);
//     }else{
//       return callback && callback({name: 'ClientOffLine'});
//     }
//   });
// }