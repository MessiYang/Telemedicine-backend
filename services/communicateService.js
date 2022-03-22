import async from 'async';
import moment from 'moment';
import logger from '../config/log';
import RoleType from '../models/type/roleType';
import CustomerModel from '../models/customerModel';
import ReserveModel from '../models/reserveModel';
import AppointmentModel from '../models/appointmentModel';
import AppointmentType from '../models/type/appointmentType';
import {decryptString} from '../utils/stringUtil';
import { noteUserToOnlineMsg, pushMessage, callUser } from '../utils/stringUtil';
import { checkCommunicateStartTimeStatus, checkMeetingStartTimeout } from '../utils/dateUtil';
import {addRoomReq} from '../utils/vidyoUtil';
//import {pushInviteOnlineMessage} from '../services/userService';
import mongoose from 'mongoose';

const FamilyMemberModel = require('../models/familyMemberModel');

const INVITE_COMMUNICATE_EVENT = 'inviteToJoinCommunicate';
let {Types: {ObjectId}} = mongoose;

export {
  getPatientFamilyList,
  getCommunicateScheduleForDoctor,
  getFamilyMembers,
  createReserve,
  removeCommunicateAppointment,
  removeReserve,
  createCommunicateAppointment,
  checkRepeatReserve,
  getReserveFamilyList,
  createInviteRoom,
  inviteMeeting,

  getCommunicateSchedule,
  replyReserve,
}

// NOTE: 註解rico原先的func.
// function getPatientFamilyList(bean, user, callback){
//   let {output} = bean;
//   let aggregateArray = [];
//   console.log('user: ', user);
//   aggregateArray.push({
//     $match:{
//       'valid': true,
//       'role': RoleType.customer.FAMILY.value
//     }
//   });
//   aggregateArray.push({
//     $lookup: {
//       'from': 'Customer',
//       'localField': 'relationalPatientId',
//       'foreignField': '_id',
//       'as': 'relationalPatientId',
//     }
//   });
//   aggregateArray.push({
//     $unwind: {
//       path: '$relationalPatientId',
//       preserveNullAndEmptyArrays: true,
//     }
//   });
//   aggregateArray.push({
//     $match:{
//       'relationalPatientId.department': user.department,
//       'relationalPatientId.departmentCode': user.departmentCode
//     }
//   });
//   aggregateArray.push({
//     $group: {
//       '_id':{
//         _id: '$relationalPatientId._id',
//         name:'$relationalPatientId.name',
//         department:'$relationalPatientId.department',
//         departmentCode:'$relationalPatientId.departmentCode',
//         wardName:'$relationalPatientId.wardName',
//         wardCode:'$relationalPatientId.wardCode',
//         personalId:'$relationalPatientId.personalId',
//         mobile: '$relationalPatientId.mobile',
//       },
//       'familyMembers':{
//         $addToSet: {
//           '_id': '$_id',
//           'name': '$name',
//           'mobile': '$mobile',
//           'personalId': '$personalId',
//           'relationship': '$relationship',
//           'isMainContact': '$isMainContact',
//         }
//       },
//     }
//   });
//   aggregateArray.push({
//     $sort: {
//       '_id._id': 1,
//     }
//   });
//   aggregateArray.push({
//     $project: {
//       '_id': 0,
//       'patient': '$_id',
//       'familyMembers': 1
//     }
//   }); 
//   CustomerModel.aggregate(aggregateArray, (err, result)=>{
//     if(err) return callback && callback(err);
//     if(!result) return callback && callback({name:'DataNotFound'});
//     result.forEach(ele => {
//       if(ele.patient && ele.patient.personalId)  ele.patient.personalId = decryptString(ele.patient.personalId);
//       if(ele.patient && ele.patient.name) ele.patient.name = decryptString(ele.patient.name);
//       if(ele.familyMembers && ele.familyMembers.length){
//         ele.familyMembers.forEach(member => {
//           member.personalId = decryptString(member.personalId);
//           member.name = decryptString(member.name);
//         });
//       }
//     });
//     output.result = result;
//     callback && callback(null);
//   });
// }

/**
 * 
 * Goal. 調整原先從customer model撈取病患與家屬的關係資料，改從新的familyMember model撈取。
 * Annotator. Jack Hu
 * Date. 20211228
 * 
 * @param {Obejct} bean -> 資料傳遞與驗證的種子
 * @param {Object} user -> 使用者資料
 * @param {Function} callback 
 * 
 */
function getPatientFamilyList(bean, user, callback) {
  let {output} = bean;
  let aggregateArray = [];
  console.log('user: ', user);

  aggregateArray.push({
    $lookup: {
      'from': 'Customer',
      'localField': 'customerID',
      'foreignField': '_id',
      'as': 'customerID',
    }
  })
  aggregateArray.push({
    $unwind: {
      path: '$customerID',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $match:{
      'customerID.department': user.department,
      'customerID.departmentCode': user.departmentCode
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$memberList',
      preserveNullAndEmptyArrays: true, 
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Customer',
      'localField': 'memberList.customerID',
      'foreignField': '_id',
      'as': 'memberListCustomerID',
    }
  })
  aggregateArray.push({
    $unwind: {
      path: '$memberListCustomerID',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id':{
        _id: '$customerID._id',
        name:'$customerID.name',
        department:'$customerID.department',
        departmentCode:'$customerID.departmentCode',
        wardName:'$customerID.wardName',
        wardCode:'$customerID.wardCode',
        personalId:'$customerID.personalId',
        mobile: '$customerID.mobile',
      },
      'familyMembers':{
        $addToSet: {
          '_id': '$memberList.customerID',
          'name': '$memberListCustomerID.name',
          'mobile': '$memberListCustomerID.mobile',
          'personalId': '$memberListCustomerID.personalId',
          'relationship': '$memberList.relationship',
          'isMainContact': '$memberList.isMainContact',
        }
      }
    }
  });
  aggregateArray.push({
    $sort: {
      '_id._id': 1,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'patient': '$_id',
      'familyMembers': 1
    }
  });

  FamilyMemberModel.aggregate(aggregateArray, (err, result)=> {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({ name:'DataNotFound' });

    result.forEach((ele)=> {
      if(ele.patient && ele.patient.personalId)  ele.patient.personalId = decryptString(ele.patient.personalId);
      if(ele.patient && ele.patient.name) ele.patient.name = decryptString(ele.patient.name);
      
      if(ele.familyMembers && ele.familyMembers.length) {

        ele.familyMembers.forEach((member)=> {
          member.personalId = decryptString(member.personalId);
          member.name = decryptString(member.name);
        });
      }
    });

    output.result = result;
    callback && callback(null);
  })
}

// NOTE: 註解rico原先的func.
// function getCommunicateScheduleForDoctor(bean, user, callback){
//   let {output} = bean;
//   let aggregateArray = [];
//   console.log('user: ', user);
//   aggregateArray.push({
//     $match:{
//       'valid': true,
//       'doctorId': ObjectId(user._id),
//     }
//   });
//   aggregateArray.push({
//     $lookup: {
//       'from': 'Appointment',
//       'localField': 'appointmentId',
//       'foreignField': '_id',
//       'as': 'appointmentId',
//     }
//   });
//   aggregateArray.push({
//     $unwind: {
//       path: '$appointmentId',
//       preserveNullAndEmptyArrays: true,
//     }
//   });
//   aggregateArray.push({
//     $match:{
//       'appointmentId.valid': true,
//       'appointmentId.expectedStartTime': {'$gte': moment( new Date()).startOf('day').toDate()}
//     }
//   });
//   aggregateArray.push({
//     $lookup: {
//       'from': 'Customer',
//       'localField': 'appointmentId.patientId',
//       'foreignField': '_id',
//       'as': 'patientData',
//     }
//   });
//   aggregateArray.push({
//     $unwind: {
//       path: '$patientData',
//       preserveNullAndEmptyArrays: true,
//     }
//   });
//   aggregateArray.push({
//     $lookup: {
//       'from': 'Customer',
//       'localField': 'familymemberId',
//       'foreignField': '_id',
//       'as': 'familymemberId',
//     }
//   });
//   aggregateArray.push({
//     $unwind: {
//       path: '$familymemberId',
//       preserveNullAndEmptyArrays: true,
//     }
//   });
//   aggregateArray.push({
//     $group: {
//       '_id':{
//         _id: '$appointmentId._id',
//         appointmentId: '$appointmentId._id',
//         patientId: '$patientData._id',
//         patientName: '$patientData.name',
//         patientPersonalId: '$patientData.personalId',
//         patientMobile: '$patientData.mobile',
//         wardCode: '$patientData.wardCode',
//         wardName: '$patientData.wardName',
//         department: '$patientData.department',
//         departmentCode: '$patientData.departmentCode',
//         meetingStartTime:'$appointmentId.expectedStartTime',
//         meetingEndTime:'$appointmentId.expectedEndTime',
//       },
//       'familyMembers':{
//         $addToSet: {
//           '_id': '$familymemberId._id',
//           'name': '$familymemberId.name',
//           'relationship': '$familymemberId.relationship',
//           'isReceiveCalling': '$isReceiveCalling',
//           'isMainContact': '$familymemberId.isMainContact',
//           'mobile': '$familymemberId.mobile',
//         }
//       },
//     }
//   });
//   aggregateArray.push({
//     $project: {
//       '_id': 0,
//       'patient': '$_id',
//       'familyMembers': 1
//     }
//   }); 
//   aggregateArray.push({
//     $sort: {
//       'patient.meetingStartTime': 1,
//     }
//   });
//   // aggregateArray.push({
//   //   $sort: {
//   //     'patient.departmentCode': 1,
//   //   }
//   // });
//   ReserveModel.aggregate(aggregateArray, (err, result)=>{
//     if(err) return callback && callback(err);
//     if(!result) return callback && callback({name:'DataNotFound'});
//     result.forEach(ele => {
//       if(ele.patient && ele.patient.meetingStartTime)  ele.patient.isTimeOut = checkMeetingStartTimeout(ele.patient.meetingStartTime, 30);
//       if(ele.patient && ele.patient.patientPersonalId)  ele.patient.patientPersonalId = decryptString(ele.patient.patientPersonalId);
//       if(ele.patient && ele.patient.patientName) ele.patient.patientName = decryptString(ele.patient.patientName);
//       if(ele.familyMembers && ele.familyMembers.length){
//         ele.familyMembers.forEach(member => {
//           member.personalId = decryptString(member.personalId);
//           member.name = decryptString(member.name);
//         });
//       }
//     });
//     output.result = result;
//     callback && callback(null);
//   });
// }

/**
 * 
 * Goal. 依據醫生找出對應的預約表單。
 * Annotator. Jack Hu
 * Date. 20211229
 * 
 * History.
 * 20211229: 調整原先關聯customer model中isMainContact, relationsip相關欄位，現在改成關聯至familyMember model。
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子 
 * @param {Object} user -> 使用者資料
 * @param {Function} callback 
 * 
 */
function getCommunicateScheduleForDoctor(bean, user, callback){
  let {output} = bean;
  let aggregateArray = [];
  console.log('user: ', user);
  aggregateArray.push({
    $match:{
      'valid': true,
      'doctorId': ObjectId(user._id),
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Appointment',
      'localField': 'appointmentId',
      'foreignField': '_id',
      'as': 'appointmentId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$appointmentId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $match:{
      'appointmentId.valid': true,
      'appointmentId.expectedStartTime': {'$gte': moment( new Date()).startOf('day').toDate()}
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Customer',
      'localField': 'appointmentId.patientId',
      'foreignField': '_id',
      'as': 'patientData',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$patientData',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'FamilyMember',
      'localField': 'patientData.relationalfamilyMemberID',
      'foreignField': '_id',
      'as': 'familyMemberData',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$familyMemberData',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$familyMemberData.memberList',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $match: {
      $expr: {
        $eq: ["$familyMemberData.memberList.customerID", "$familymemberId"]
      }
    }
  })
  aggregateArray.push({
    $lookup: {
      'from': 'Customer',
      'localField': 'familymemberId',
      'foreignField': '_id',
      'as': 'familymemberId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$familymemberId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id':{
        _id: '$appointmentId._id',
        appointmentId: '$appointmentId._id',
        patientId: '$patientData._id',
        patientName: '$patientData.name',
        patientPersonalId: '$patientData.personalId',
        patientMobile: '$patientData.mobile',
        wardCode: '$patientData.wardCode',
        wardName: '$patientData.wardName',
        departmentCode: '$patientData.departmentCode',
        meetingStartTime:'$appointmentId.expectedStartTime',
        meetingEndTime:'$appointmentId.expectedEndTime',
      },
      'familyMembers':{
        $addToSet: {
          '_id': '$familymemberId._id',
          'name': '$familymemberId.name',
          'relationship': '$familyMemberData.memberList.relationship',
          'isReceiveCalling': '$isReceiveCalling',
          'isMainContact': '$familyMemberData.memberList.isMainContact',
          'mobile': '$familymemberId.mobile',
        }
      },
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'patient': '$_id',
      'familyMembers': 1
    }
  }); 
  aggregateArray.push({
    $sort: {
      'patient.meetingStartTime': 1,
    }
  });

  // aggregateArray.push({
  //   $sort: {
  //     'patient.departmentCode': 1,
  //   }
  // });
  ReserveModel.aggregate(aggregateArray, (err, result)=>{
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    result.forEach(ele => {
      if(ele.patient && ele.patient.meetingStartTime)  ele.patient.isTimeOut = checkMeetingStartTimeout(ele.patient.meetingStartTime, 30);
      if(ele.patient && ele.patient.patientPersonalId)  ele.patient.patientPersonalId = decryptString(ele.patient.patientPersonalId);
      if(ele.patient && ele.patient.patientName) ele.patient.patientName = decryptString(ele.patient.patientName);
      if(ele.familyMembers && ele.familyMembers.length){
        ele.familyMembers.forEach(member => {
          member.personalId = decryptString(member.personalId);
          member.name = decryptString(member.name);
        });
      }
    });

    console.log('[getCommunicateScheduleForDoctor] result: ', result);
     
    output.result = result;
    callback && callback(null);
  });
}

// NOTE: 註解rico原先的func.
// function getFamilyMembers(bean, callback){
//   let {input} = bean;
// 	let where = {
//     'valid': true,
//     'relationalPatientId': input.patientId
// 	}
//   CustomerModel.find(where)
//   .select('-__target -__targetVer -valid -modifyTime -createTime')
//   .populate({
//     path: 'relationalPatientId',
//     select: '-valid -__target -__targetVer -modifyTime -createTime',
//     //match: {'valid': true},
//   })
//   .exec((err, result) => {
// 		if(err) return callback && callback(err);
//     if(!result) return callback && callback({name:'DataNotFound'});
//     result.forEach(ele => {
//       if(ele.name)  ele.name = decryptString(ele.name);
//       if(ele.personalId) ele.personalId = decryptString(ele.personalId);
//       if(ele.relationalPatientId && ele.relationalPatientId.length){
//         ele.relationalPatientId.forEach(member => {
//           member.personalId = decryptString(member.personalId);
//           member.name = decryptString(member.name);
//         });
//       }
//     });
//     console.log('[getFamilyMembers]result: ',result)
//     input.familyMembers = result;
//     //output.result = result;
// 		return callback && callback(null);
// 	});
// }

/**
 * 
 * Goal. 取得該病患的家屬成員表。
 * Annotator. Jack Hu
 * Date. 20211229
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子 
 * @param {Function} callback
 *  
 */
// REVIEW: 還需要再優化。
function getFamilyMembers(bean, callback){

  let { input, output } = bean;

  let where = {
    'customerID': ObjectId(input.patientId),
    'valid': true, 
  }

  // let aggregateArray = [];
  
  // aggregateArray.push({
  //   $match:{
  //     'customerID': ObjectId(input.patientId),
  //     'valid': true,
  //   }
  // }); 
  // aggregateArray.push({
  //   $unwind: {
  //     path: '$memberList',
  //     preserveNullAndEmptyArrays: true,
  //   }
  // });
  // aggregateArray.push({
  //   $lookup: {
  //     'from': 'Customer',
  //     'localField': 'memberList.customerID',
  //     'foreignField': '_id',
  //     'as': 'memberList.customerID',
  //   }
  // });
  // aggregateArray.push({
  //   $unwind: {
  //     path: '$memberList.customerID',
  //     preserveNullAndEmptyArrays: true,
  //   }
  // }); 
  // aggregateArray.push({
  //   $project: {
  //     '_id': 0,
  //     'customerID': 0,
  //     'valid': 0,
  //     'modifyTime': 0,
  //     'createTime': 0,
  //   }
  // });

  // FamilyMemberModel.aggregate(aggregateArray, (err, result)=> {
  //   if(err) return callback && callback(err);
  //   if(!result) return callback && callback({name:'DataNotFound'});

  //   result.forEach((ele)=> {
  //     if(ele.memberList && ele.memberList.customerID) {
  //       let customerInfo = ele.memberList.customerID;
  //       customerInfo.personalId = decryptString(customerInfo.personalId);
  //       customerInfo.name = decryptString(customerInfo.name);
  //     }

  //   });
    
  //   console.log('[getFamilyMembers] result: ', result);
  //   output.result = result;
  //   return callback && callback(null);
  // });  

  FamilyMemberModel
    .find(where)
    .select('memberList -_id')
    .populate({
      path: 'memberList.customerID',
      select: '-valid -__target -__targetVer -modifyTime -createTime',
      //match: {'valid': true},
    })
    .exec((err, result) => {
      if(err) return callback && callback(err);
      if(!result) return callback && callback({ name:'DataNotFound' });

      result.forEach(ele => {
        if(ele.memberList && ele.memberList.length){
          ele.memberList.forEach(member => {
            member.customerID.personalId = decryptString(member.customerID.personalId);
            member.customerID.name = decryptString(member.customerID.name);
          });
        }
      });

      console.log('[getFamilyMembers] result: ', result)
      console.log('[getFamilyMembers] result[0].memberList: ', result[0].memberList)
      
      input.familyMembers = result[0].memberList;
      //output.result = result;
      return callback && callback(null);
    });
}

function createCommunicateAppointment(bean, user, callback){
  let {input} = bean;
  let saveData = {
    'doctorId': user._id,
    'expectedStartTime': input.meetingStartTime,
    'expectedEndTime': input.meetingEndTime,
    'patientId': input.patientId,
    'status': AppointmentType.COMMUN.value
  }
  new AppointmentModel(saveData).save((err, saveResult) => {
    if (err) return callback && callback(err);
    if (!saveResult) return callback && callback({name: 'CreateError'});
    input.communicateAptId = saveResult._id;
    return callback && callback(null);
  });
}

// NOTE: 註解rico原先的func.
// function createReserve(bean, user, callback){
//   let {input, output} = bean;
//   console.log('[createReserve] input: ',input)
//   let familymemberList = input.familyMembers;
//   async.map(familymemberList, mapCreateReserveAndNotifyUser, (err, results)=>{
//     if(err) logger.info("[createReserve] err: ", err);
//     logger.info("[createReserve]  results:", results);
//     output.result = results;
//     return callback && callback(null);
//   });
//   function mapCreateReserveAndNotifyUser(member, cb) {
//     let saveData = {
//       'topic': 'communicate',
//       'patientId': input.patientId,
//       'doctorId': user._id,
//       'familymemberId': member._id,
//       //'meetingStartTime': input.meetingStartTime,
//       'appointmentId': input.communicateAptId,
//     }
//     new ReserveModel(saveData).save((err, result) => {
//       if (err) {
//         return cb(null, 'create fail');
//       } else if (!result) {
//         return cb(null, 'create fail');
//       } else {
//         console.log('[mapCreateReserveAndNotifyUser]result: ',result)
//         let topic = 'Telemedicine遠距病情溝通'; 
//         let msg = input.companyList[0].displayname+' '+user.name+'醫師 '+user.department
//         +' '+moment(input.meetingStartTime).format("YYYY年MM月DD日 HH:mm"); 
//         let msgData = {
//           'event': 'scheduleToCommunication',
//           'meetingStartTime': input.meetingStartTime,
//           'meetingEndTime': input.meetingEndTime,
//           'reserveId': result._id,
//           'doctorName': user.name,
//           'patientName': input.userData.name
//         }
//         console.log('[mapCreateReserveAndNotifyUser]msgData: ',msgData)
//         console.log('[mapCreateReserveAndNotifyUser]msg: ',msg)
//         console.log('[mapCreateReserveAndNotifyUser]input: ',input)
//         console.log('[mapCreateReserveAndNotifyUser]member.apnToken: ',member.apnToken)
//         pushMessage(input.isDebug, member.apnToken, member.fcmToken, topic, msg, msgData, 'c');
//         return cb(null, 'OK');
//       }
//     });
//   }
// }

/**
 * 
 * Goal. 建立醫病溝通預約資訊。
 * Annotator. Jack Hu
 * Date. 20211229
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子 
 * @param {Object} user -> 使用者資訊(roleType:128) 
 * @param {Function} callback 
 * 
 */
function createReserve(bean, user, callback){
  let {input, output} = bean;
  console.log('[createReserve] input: ',input)
  let familymemberList = input.familyMembers;
  async.map(familymemberList, mapCreateReserveAndNotifyUser, (err, results)=>{
    if(err) logger.info("[createReserve] err: ", err);
    logger.info("[createReserve]  results:", results);
    output.result = results;
    return callback && callback(null);
  });
  function mapCreateReserveAndNotifyUser(member, cb) {
    let saveData = {
      'topic': 'communicate',
      'patientId': input.patientId,
      'doctorId': user._id,
      'familymemberId': member.customerID._id,
      //'meetingStartTime': input.meetingStartTime,
      'appointmentId': input.communicateAptId,
    }
    new ReserveModel(saveData).save((err, result) => {
      if (err) {
        return cb(null, 'create fail');
      } else if (!result) {
        return cb(null, 'create fail');
      } else {
        console.log('[mapCreateReserveAndNotifyUser]result: ',result)
        let topic = 'Telemedicine遠距病情溝通'; 
        let msg = input.companyList[0].displayname+' '+user.name+'醫師 '+user.department
        +' '+moment(input.meetingStartTime).format("YYYY年MM月DD日 HH:mm"); 
        let msgData = {
          'event': 'scheduleToCommunication',
          'meetingStartTime': input.meetingStartTime,
          'meetingEndTime': input.meetingEndTime,
          'reserveId': result._id,
          'doctorName': user.name,
          'patientName': input.userData.name
        }
        console.log('[mapCreateReserveAndNotifyUser]msgData: ',msgData)
        console.log('[mapCreateReserveAndNotifyUser]msg: ',msg)
        console.log('[mapCreateReserveAndNotifyUser]input: ',input)
        console.log('[mapCreateReserveAndNotifyUser]member.customerID.apnToken: ',member.customerID.apnToken)
        pushMessage(input.isDebug, member.customerID.apnToken, member.customerID.fcmToken, topic, msg, msgData, 'c');
        return cb(null, 'OK');
      }
    });
  }
}

function checkRepeatReserve(bean, user, callback){
  let {input} = bean;
  console.log('[checkRepeatReserve]input: ',input)
	let where = {
    'valid': true,
    'doctorId': user._id,
    'patientId': input.patientId,
    //'meetingStartTime': input.meetingStartTime,
	}
  ReserveModel.findOne(where)
  .select('-__target -__targetVer -valid -modifyTime -createTime -familymemberId -topic')
  .populate({
    path: 'appointmentId',
    select: '_id expectedStartTime',
    match: {
      'valid': true,
      'expectedStartTime': input.meetingStartTime
    },
  })
  .exec((err, result) => {
    console.log('[checkRepeatReserve]result: ',result)
		if(err) return callback && callback(err);
    if(result && result.appointmentId) return callback && callback({name:'RepeatReserveMeetingTime'});
		return callback && callback(null);
	});
}

function removeCommunicateAppointment(bean, callback) {
  let {input} = bean;
  console.log('[cancelAppointment] input: ', input);
  let where = {
    'valid': true,
    '_id': input.appointmentId
  }
  console.log('[cancelAppointment] where: ', where);
  let updateData = {
    'valid': false,
    //'status': AppointmentType.CANCEL.value,
    'invalidTime': new Date()
  }
  AppointmentModel.updateOne(where, {$set: updateData}
  , (err, updateResult) => {
    console.log('updateResult: ', updateResult);
    if (err) return callback(err, null);
    if (!updateResult) return callback && callback({name: 'DataNotFound'});
    return callback && callback(null);
  });
}

function removeReserve(bean, callback) {
  let {input} = bean;
  let where = {
    'valid': true,
    'appointmentId': input.appointmentId
  }
  let updateData = {
    'valid': false,
    'invalidTime': new Date()
  };
  ReserveModel.updateMany(where, {$set: updateData}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('result: ', result);
    return callback && callback(null);
  });
}

// NOTE: 註解rico原先的func.
// function getReserveFamilyList(bean, callback){
//   let {input} = bean;
//   if(!input.appointmentId) return callback && callback(null);
// 	let where = {
//     'valid': true,
//     'appointmentId': input.appointmentId,
//     //"isReceiveCalling" : true
//     //'$or': [ { "isReceiveCalling" : true }, { "isMainContact": true } ] 
// 	}
//   ReserveModel.find(where)
//   .select('isReceiveCalling familymemberId')
//   .populate({
//     path: 'familymemberId',
//     select: '_id isMainContact',
//     //match: {'valid': true},
//   })
//   .exec((err, result) => {
//     console.log('[getReserveFamilyList] result: ', result);
// 		if(err) return callback && callback(err);
//     if(!result || !result.length) return callback && callback({name:'DataNotFound'});
//     let familyList = []
//     result.forEach(ele => {
//       if(ele.familymemberId){
//         if(ele.familymemberId.isMainContact==true || ele.isReceiveCalling==true) familyList.push(ele.familymemberId._id);
//       }
//     });
//     input.familyList = familyList;
//     console.log('[getReserveFamilyList] familyList: ', familyList);
// 		return callback && callback(null);
// 	});
// }

/**
 * 
 * Goal. 取得該會議已預約是否接受call的成員清單。
 * Annotator. Jack Hu
 * Date. 20211229
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子
 * @param {Function} callback 
 * @returns 
 * 
 */
// REVIEW: 資料處理需再優化 
function getReserveFamilyList(bean, callback){
  let {input} = bean;
  if(!input.appointmentId) return callback && callback(null);
	let where = {
    'valid': true,
    'appointmentId': input.appointmentId,
    //"isReceiveCalling" : true
    //'$or': [ { "isReceiveCalling" : true }, { "isMainContact": true } ] 
	}
  ReserveModel.find(where)
  .select('isReceiveCalling familymemberId patientId')
  .populate({
    path: 'patientId',
    select: 'relationalfamilyMemberID',
    populate: {
      path: 'relationalfamilyMemberID', 
    }
    //match: {'valid': true},
  })
  .exec((err, result)=> {
		if(err) return callback && callback(err);
    if(!result || !result.length) return callback && callback({name:'DataNotFound'});
    
    let familyList = [];

    result.forEach(ele => {
      let _tmpArr;

      if(ele.familymemberId){
        _tmpArr = ele.patientId.relationalfamilyMemberID.memberList.filter((member2)=> {
          if(String(member2.customerID) === String(ele.familymemberId)) return true;
        });

        if(_tmpArr[0].isMainContact == true || ele.isReceiveCalling == true) familyList.push(ele.familymemberId);
      }
    });

    console.log('[getReserveFamilyList] result: ', result);

    input.familyList = familyList;
    console.log('[getReserveFamilyList] familyList: ', familyList);
    
		return callback && callback(null);
	});
}


function createInviteRoom(bean, user, callback){
  console.log('[createInviteRoom] user: ', user);
  let {input, output} = bean;
  console.log('[createInviteRoom] input: ', input);
  if(input.appointmentId){//預約撥打
    addRoomReq(user, 'callToUser', input.appointmentId, (err, result)=>{
      if (err) return callback && callback(err);
      if(!result) return callback && callback({name: 'VidyoErr'});
      let updateData = {
        'vidyoRoomUrl': result.vidyoRoomUrl,
        'vidyoPin': result.vidyoPin,
        'vidyoRoomID': result.vidyoRoomID
      }
      AppointmentModel.findOneAndUpdate({'_id': input.appointmentId, 'valid': true},
      updateData, (err, updateResult) => {
        if (err) return callback && callback(err);
        if(!updateResult) return callback && callback({name: 'DataNotFound'});
        let msg = updateData
        if(user.name) msg.name = user.name;
        if(user.department) msg.department = user.department;
        input.msgData = msg;
        input.msgData.event = INVITE_COMMUNICATE_EVENT;
        output.result = msg;
        return callback && callback(null);
      });  
    });    
  }else if(input.patientId && input.familyIdList){ //直接撥打
    let saveData = {
      'doctorId': user._id,
      'expectedStartTime': new Date(),
      'patientId': input.patientId,
      'status': AppointmentType.COMMUN.value
    }
    new AppointmentModel(saveData).save((err, saveResult) => {
      if (err) return callback && callback(err);
      addRoomReq(user, 'callToUser', saveResult._id, (err, result)=>{
        if(err)  return callback && callback(err);
        if(!result) return callback && callback({name: 'VidyoErr'});
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
          input.msgData = msg;
          input.msgData.event = INVITE_COMMUNICATE_EVENT;
          input.familyList = input.familyIdList;
          output.result = msg;
          return callback && callback(null);
        });
      }); 
    });
  }else{
    return callback && callback({name: 'ParamMalformedError'});
  }
}

function inviteMeeting(bean, user, callback) {
  let {input} = bean;
  console.log('[inviteMeeting]input: ',input)
  async.map(input.familyList, mapPushInviteMessage, (err, results)=>{
    if(err) logger.info("[inviteMeeting] err: ", err);
    logger.info("[inviteMeeting]  results:", results);
    //output.result = results;
    return callback && callback(null);
  });
  function mapPushInviteMessage(userId, cb){
    console.log('[inviteMeeting]userId: ',userId)
    let where = {
      '_id': userId,
      'valid': true
    }
    CustomerModel.findOne(where)
    .select('-__target -__targetVer -valid -modifyTime -createTime -apnDebugToken -accountId')
    .exec((err, result) => {
      if(err) return cb(null, err);
      if(!result) return cb(null, 'user not fund');
      console.log('[getUser]result: ',result)
      let alertMsg = noteUserToOnlineMsg(user.name, result.name)
      let msgData = null;
      if(input.msgData) msgData = input.msgData;
      callUser(input.isDebug, result.voipToken, result.fcmToken, alertMsg, alertMsg, msgData);
      return cb(null, 'OK');
    });
  }
}


function getCommunicateSchedule(bean, user, callback){
  let {output} = bean;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      'familymemberId':  ObjectId(user._id)
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Appointment',
      'localField': 'appointmentId',
      'foreignField': '_id',
      'as': 'appointmentId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$appointmentId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $match:{
      'appointmentId.valid': true,
      'appointmentId.expectedStartTime': {'$gte': moment( new Date()).startOf('day').toDate()}
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
    $project: {
      '_id': 1,
      'patientId._id':  1,
      'patientId.name':  1,
      'patientId.wardName':  1,
      'patientId.wardCode':  1,
      'doctorId._id':  1,
      'doctorId.name':  1,
      'doctorId.department':  1,
      'doctorId.departmentCode':  1,
      'doctorId.currentVidyoRoomUrl':  1,
      'haveReplyReserve': 1,
      'isReceiveCalling': 1,
      "appointmentId._id": 1,
      "appointmentId.expectedStartTime": 1,
      "appointmentId.expectedEndTime": 1,
      "appointmentId.status": 1,
      "appointmentId.vidyoPin": 1,
      "appointmentId.vidyoRoomID": 1,
      "appointmentId.vidyoRoomUrl": 1,
    }
  }); 
  aggregateArray.push({
    $sort: {
      'appointmentId.expectedStartTime': 1,
    }
  });
  // aggregateArray.push({
  //   $sort: {
  //     'appointmentId.vidyoPin': 1,
  //   }
  // });
  ReserveModel.aggregate(aggregateArray, (err, result)=>{
		if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    result = result.filter(result => result.appointmentId != null);
    result.forEach(ele => {
      if(ele.patientId.name)  ele.patientId.name = decryptString(ele.patientId.name);
      if(ele.appointmentId && ele.doctorId) ele.appointmentId.status = checkCommunicateStartTimeStatus(ele.appointmentId, ele.doctorId);
      console.log('[getCommunicateSchedule]ele.status: ',ele.appointmentId)
    });
    output.result = result;
		return callback && callback(null);
	});
}

function replyReserve(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.reserveId
  }
  let updateData = {
    'isReceiveCalling': false,
    'haveReplyReserve': true
  };
  if(input.isReceiveCalling == true) updateData.isReceiveCalling = true;
  ReserveModel.update(where, {$set: updateData}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('[replyReserve]  result: ', result);
    return callback && callback(null);
  });
}

