import util from 'util';
import async from 'async';
import moment from 'moment';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import ReserveModel from '../../models/reserveModel';
import OutpatientModel from '../../models/outpatientModel';
import AppointmentModel from '../../models/appointmentModel';
import AppointmentType from '../../models/type/appointmentType';
import {outpatientReady } from '../../services/outpatientService';
import {noteFamilyCommunicateReadyMsg, pushMessage, noteDoctorCommunicateReadyMsg, decryptString} from '../../utils/stringUtil';

const PREPARE_TIME_CREATE_MEETING = 15;

function checkOutpatientTimeJob() {
  baseJob.apply(this, arguments);
}

util.inherits(checkOutpatientTimeJob, baseJob);

let job = new checkOutpatientTimeJob('000001', 'checkOutpatientTimeJob', ()=>{
  //console.log('[checkOutpatientTimeJob] job start ...');
  let nowDate = new Date();
  let needNoteAppointmentResult, needNoteFamilyResult;
  async.series({
    checkExpectedStartTime: (callback)=>{
      let where = {
        'valid': true,
        'expectedStartTime': {'$gte': moment(nowDate), '$lt': moment(nowDate).add(PREPARE_TIME_CREATE_MEETING, 'm')},
        'status': AppointmentType.COMMUN.value
      }; 
      AppointmentModel.find(where)
      .select('-valid')
      .populate({
        path: 'doctorId',
        select: '_id name companyId department email apnToken fcmToken',
        //match: {'valid': true},
      })
      .sort({'startTime': 1})
      .exec((err, result) => {
        //console.log('[checkExpectedStartTime] result: ', result);
        if (err) {
          return logger.info('[checkExpectedStartTime] err:', err);
        } else if (!result || !result.length) {
          //console.log('[checkOutpatientTimeJob] no need update!');
          callback();
        } else {
          needNoteAppointmentResult = result;
          callback();
        }
      });
    },
    updateCommunicateStatusReady: (callback)=>{
      if(!needNoteAppointmentResult || !needNoteAppointmentResult.length) return callback();
      async.map(needNoteAppointmentResult, communicateReady, (err, result)=>{
        if (err) return logger.info('[updateCommunicateStatusReady] err:', err);
        console.log('[updateCommunicateStatusReady] result: ', result);
        callback();
      });
    },
    getFamilyList: (callback)=>{
      if(!needNoteAppointmentResult || !needNoteAppointmentResult.length) return callback();
      let appointmentIdList = [];
      needNoteAppointmentResult.forEach(element => {
        appointmentIdList.push(element._id);
      });
      console.log('[getFamilyList] appointmentIdList: ', appointmentIdList);
      let where = {
        'valid': true,
        'isReceiveCalling': true,
        'appointmentId': {'$in': appointmentIdList},
      }
      ReserveModel.find(where)
      .select('-__target -__targetVer -valid -modifyTime -createTime -topic')
      .populate({
        path: 'familymemberId',
        select: '_id name companyId email apnToken fcmToken',
        //match: {'valid': true},
      })
      .populate({
        path: 'appointmentId',
        select: ' -__target -__targetVer -valid -modifyTime -createTime ',
        populate: {
          path: 'doctorId',
          select: ' -__target -__targetVer -valid -modifyTime -createTime',
        }
      })
      .exec((err, result) => {
        if(err) return callback && callback(err);
        if(!result) return callback && callback({name:'DataNotFound'});
        result = result.filter(result => result.appointmentId != null);
        result.forEach(ele => {
          if(ele.patientId.name)  ele.patientId.name = decryptString(ele.patientId.name);
        });
        console.log('[checkOutpatientTimeJob] result: ', result);
        needNoteFamilyResult = result;
        return callback && callback(null);
      });   
    },
    notification: (callback)=>{
      if(!needNoteFamilyResult || !needNoteFamilyResult.length) return callback();
      async.map(needNoteFamilyResult, notificationEach, (err)=>{
        if (err) return logger.info('[checkOutpatientTimeJob] err:', err);
        callback();
      });
    }
  }, function(err) {
    if (err) {
      logger.info('[checkOutpatientTimeJob] err:', err);
    } 
  });   

  function communicateReady(data, callback){
    let where = {
      'valid': true,
      '_id': data._id
    }
    let updateData = {
      'status': AppointmentType.COMMUN_NOT.value
    }
    AppointmentModel.findOneAndUpdate(where,
    updateData, (err, updateResult) => {
      if (err) return callback(err, null);
      if (!updateResult) return callback({name: 'DataNotFound'}, null);
      if(!data.doctorId || !data.doctorId.apnToken || !data.doctorId.fcmToken) return callback(null, updateResult);
      if(data.doctorId.apnToken.length||data.doctorId.fcmToken.length){
        let title = "醫病溝通即將開始"
        let msg = noteDoctorCommunicateReadyMsg(data);
        console.log('[notificationEach] msg: ', msg);
        pushMessage(true, data.doctorId.apnToken, data.doctorId.fcmToken, title, msg, null, 'e');
      }
      callback(null, updateResult);
    });  
  }

  function notificationEach(data, cb){
    if(data.familymemberId.apnToken.length||data.familymemberId.fcmToken.length){
      let title = "醫病溝通即將開始"
      let msg = noteFamilyCommunicateReadyMsg(data.familymemberId, data.appointmentId);
      console.log('[notificationEach] msg: ', msg);
      pushMessage(true, data.familymemberId.apnToken, data.familymemberId.fcmToken, title, msg, null, 'c');
    }
    cb();
  }
});

module.exports = job;