import util from 'util';
import async from 'async';
import moment from 'moment';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import OutpatientModel from '../../models/outpatientModel';
import AppointmentModel from '../../models/appointmentModel';
import OutpatientType from '../../models/type/outpatientType';
import {outpatientReady } from '../../services/outpatientService';
import {noteFirstPatientReadyMsg, pushMessage} from '../../utils/stringUtil';

const PREPARE_TIME_CREATE_ZOOMMEETING = 30;
const FIRST_NOTE_PATIENT_NUMBER = 3;

function checkOutpatientTimeJob() {
  baseJob.apply(this, arguments);
}

util.inherits(checkOutpatientTimeJob, baseJob);

let job = new checkOutpatientTimeJob('000001', 'checkOutpatientTimeJob', ()=>{
    //logger.info('[checkOutpatientTimeJob] job start ...');
    let nowDate = new Date();
    let latestOutpatientResult, needNoteResult;
    async.series({
      getLatestOutpatient: (callback)=>{
        let where = {
          'valid': true,
          'startTime': {'$gte': moment(nowDate), '$lt': moment(nowDate).add(PREPARE_TIME_CREATE_ZOOMMEETING, 'm')},
          'status': OutpatientType.UPCOMING.value
        }; 
        OutpatientModel.find(where)
        .select('-valid')
        .populate({
          path: 'doctorId',
          select: '_id name companyId email apnToken fcmToken',
          //match: {'valid': true},
        })
        .sort({'startTime': 1})
        .exec((err, result) => {
          if (err) {
            return logger.info('[checkOutpatientTimeJob] err:', err);
          } else if (!result || !result.length) {
            //console.log('[checkOutpatientTimeJob] no need update!');
            callback();
          } else {
            latestOutpatientResult = result;
            callback();
          }
        });
      },
      // createZoomMeeting: function(callback) {
      //   if(needCreateZoom){ 
      //     async.map(latestOutpatientResult, createMeeting, (err, result)=>{
      //       if (err) return logger.info('[checkOutpatientTimeJob] err:', err);
      //       console.log('[checkOutpatientTimeJob] result: ', result);
      //       callback();
      //     });
      //   }else callback();
      // }
      updateOutpatientStatusReady: (callback)=>{
        if(!latestOutpatientResult || !latestOutpatientResult.length) return callback();
        async.map(latestOutpatientResult, outpatientReady, (err, result)=>{
          if (err) return logger.info('[checkOutpatientTimeJob] err:', err);
          console.log('[checkOutpatientTimeJob] result: ', result);
          callback();
        });
      },
      notePatientReady: (callback)=>{
        if(!latestOutpatientResult || !latestOutpatientResult.length) return callback();
        let where = {
          'valid': true,
          'outpatientId': {'$in': latestOutpatientResult},
        }; 
        AppointmentModel.find(where)
        .sort({'sortNumber': 1, 'createTime': 1})
        .limit(FIRST_NOTE_PATIENT_NUMBER)
        .select('-valid -modifyTime -createTime -sortNumber -meetingUUID')
        .populate({
          path: 'patientId',
          select: '_id name personalId companyId email isReceiveNotification isInMeeting apnToken fcmToken',
          match: {'valid': true},
        })
        .populate({
          path: 'outpatientId',
          //select: '_id name personalId companyId email isReceiveNotification isInMeeting',
          match: {'valid': true},
          populate: {
            path: 'doctorId',
            select: '_id name companyId email apnToken fcmToken',
            populate: {
              path: 'companyId',
              select: '_id displayname',
            }
          }
        })
        .exec((err, result) => {
          if (err) return logger.info('[notePatientReady] err:', err);
          if (!result || !result.length) {
            console.log('[notePatientReady] no need note!');
            return callback();
          }
          let data;
          data = result.filter(result => result.outpatientId != null);
          data = data.filter(result => result.patientId != null);
          needNoteResult = data;
          console.log('[notePatientReady] needNoteResult: ', needNoteResult);
          callback();
        });    
      },
      notification: (callback)=>{
        if(!needNoteResult || !needNoteResult.length) return callback();
        async.map(needNoteResult, notificationEach, (err)=>{
          if (err) return logger.info('[checkOutpatientTimeJob] err:', err);
          callback();
        });
      }
    }, function(err) {
      if (err) {
        logger.info('[checkOutpatientTimeJob] err:', err);
      } 
      //logger.info('[checkOutpatientTimeJob] job end ...');
    });   

    function notificationEach(data, cb){
      // if ((!data.patientId.apnToken || !data.patientId.apnToken.length) && 
      // (!data.patientId.fcmToken || !data.patientId.fcmToken.length)) return cb();
      if(data.patientId.apnToken.length||data.patientId.fcmToken.length){
        let title = "門診即將開始"
        let msg = noteFirstPatientReadyMsg(data.patientId, data.outpatientId);
        console.log('[notificationEach] msg: ', msg);
        //let payload = {"msg":"Rico test payload"}
        //apnSend(true, data.patientId.apnToken, msg, payload, ()=>{});
        pushMessage(true, data.patientId.apnToken, data.patientId.fcmToken, title, msg, null, 'c');
      }
      cb();
    }
});

module.exports = job;