import moment from 'moment';
import config from 'nconf';
import async from 'async';
import request from 'request';
import DpayDetailModel from '../models/dpayDetailModel';
import AppointmentModel from '../models/appointmentModel';
import OutpatientModel from '../models/outpatientModel';
import logger from '../config/log';
import {requestMultipayment, requestCallbackFrontend, requestGetConfigID} from '../utils/dpayUtil';
import { decryptString} from '../utils/stringUtil';

const target = config.get('EXECUTE_TARGET');
const {DPAY_APIM_HOST, DPAY_FRONTEND_CALLBACK_URL, DPAY_NONPROFILE_HOST, DPAY_CALLERID, DAPY_PRODID, DAPY_PARTNERID, DPAY_CLIENT_ID, DPAY_CLIENT_SECRET} = config.get(target);

export {
  dpayNotifyUpdateCardData,
  callbackFrontend,
  getPaymentUrl,
  updateDpayData,
  checkAppointmentPriceAndCard,
  mapPaymentList,
};

function dpayNotifyUpdateCardData(bean, callback){
  let {input} = bean;
  logger.info('[dpayNotifyServer] dpay input: ', input);
  let where = {
    'Dpay_cfgID': input.cfgID
  }
  let updateData = {};
  if(input.paymentInfo){
    updateData.Dpay_cardToken = input.paymentInfo.cardToken;
    updateData.Dpay_expireYm = input.paymentInfo.expireYm;
    updateData.needAuthPayment = false;
  }
  AppointmentModel.updateOne(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) logger.info(`[dpayNotifyServer] cfgID: ${input.cfgID}, err: ${err}`);
    logger.info(`[dpayNotifyServer] cfgID: ${input.cfgID}, result: ${JSON.stringify(result)}`);
    return callback && callback(null);
  });
}

function callbackFrontend(bean, callback){
  let {input, output} = bean;
  logger.info('[callbackFrontend] dpay input: ', input);
  if(input.code=='0000000000' && input.matchCode && input.cfgID){
    output.url = `${DPAY_FRONTEND_CALLBACK_URL}?status=${'success'}&cfgID=${input.cfgID}&matchCode=${input.matchCode}`
    //requestCallbackFrontend('success', input.cfgID, input.matchCode, ()=>{});
  }else if(input.cfgID && input.matchCode){
    output.url = `${DPAY_FRONTEND_CALLBACK_URL}?status=${'failed'}&cfgID=${input.cfgID}&matchCode=${input.matchCode}`
    //requestCallbackFrontend('failed', input.cfgID, input.matchCode, ()=>{});
  }else{
    output.url = `${DPAY_FRONTEND_CALLBACK_URL}?status=${'failed'}&cfgID=${null}&matchCode=${null}`
    //requestCallbackFrontend('failed', null, null, ()=>{});
  }
  return callback && callback(null);
}

function getPaymentUrl(bean, callback){
  let {input, output} = bean;
  requestGetConfigID((err, result)=>{
    if (err) return callback && callback(err);
    if (!result || !result.cfgID) return callback && callback({name: 'DpayGetConfigIDErr'});
    let data = {};
    data.paymentUrl = `https://${DPAY_NONPROFILE_HOST}/dpay01/authBroker/nonProfile?callerId=${DAPY_PARTNERID}&cfgID=${result.cfgID}`
    data.cfgID = result.cfgID;
    if(result.matchCode) data.matchCode = result.matchCode;
    output.result = data;
    input.cfgID = result.cfgID
    logger.info('[getPaymentUrl] output: ', data);
    return callback && callback(null);
  });
}

function updateDpayData(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.appointmentId
  }
  let updateData = {
    'needAuthPayment': true,
  };
  if(input.cfgID) updateData.Dpay_cfgID = input.cfgID;
  AppointmentModel.updateOne(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    logger.info(`[updateDpayData] cfgID: ${input.cfgID}, result: ${JSON.stringify(result)}`);
    return callback && callback(null);
  });
}

function checkAppointmentPriceAndCard(bean, callback) {
  let { input, output} = bean;
  console.log('[checkAppointmentPriceAndCard] input: ', input);
  let queryEndTime = moment(input.queryStartTime).add(input.daysRange, 'days');
  let where = {
    'valid': true,
    'isApplyToDpay' : true,
    'startTime': {'$gte': moment(input.queryStartTime), '$lt': queryEndTime}
  }
  console.log('[checkAppointmentPriceAndCard] where: ', where);
  OutpatientModel.find(where)
  .sort({'startTime': 1})
  .select(' -__target -__targetVer -consultantIdList -valid -modifyTime')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    let outpatientIdArray = [];
    result.forEach(element => {
      outpatientIdArray.push(element._id);
    });
    let where = {
      'valid': true,
      '$or': [ {'Dpay_partnerOrderNo': {'$exists': false}}, {'Dpay_partnerOrderNo': '0'} ], 
      //'Dpay_partnerOrderNo': {'$exists': false},
      'outpatientId' : {'$in': outpatientIdArray}
    }; 
    AppointmentModel.find(where)
    .select('-valid -modifyTime -createTime -consultantIdList -meetingNumber -meetingUUID')
    .populate({
      path: 'outpatientId',
      //select: '_id name companyId email isReceiveNotification',
    })
    .populate({
      path: 'patientId',
      select: '_id personalId name',
    })
    .sort({'startTime': 1})
    .select(' -__target -__targetVer -consultantIdList -valid -modifyTime')
    .exec((err, result) => {
      if(err) return callback && callback(err);
      if(!result) return callback && callback({name:'DataNotFound'});
      let paymentList = [];
      result.forEach(ele => {
        let data;
        if(ele.Dpay_cardToken && ele.Dpay_expireYm && ele.patientId && ele.patientId.name){
          data = {
            'appointmentId': ele._id,
            'cardToken' : ele.Dpay_cardToken,
            'expireYm' : ele.Dpay_expireYm,
            'patientName': decryptString(ele.patientId.name)
          }
          if(ele.Dpay_paymentAmount) data.paymentAmount = ele.Dpay_paymentAmount;
          if(ele.outpatientId && ele.outpatientId.isCounselingClinic && ele.outpatientId.counselingPrice) data.paymentAmount = ele.outpatientId.counselingPrice;
          if(data.paymentAmount>0) paymentList.push(data);
        }
      });
      input.paymentList = paymentList;
      return callback && callback(null);
    });
  });
}


function mapPaymentList(bean, callback) {
  let {input, output} = bean;
  console.log('[mapPaymentList] input: ', input);
  if (!input.paymentList.length) {
    logger.info("[mapPaymentList] No paymentList! ");
    return callback && callback(null);
  }
  async.mapLimit(input.paymentList, 2, authAndPaymentEachUser, (err, results)=>{
    if(err) logger.info("[mapPaymentList] err: ", err);
    logger.info("[mapPaymentList] ALL Finish !!!!!!!!  results:", results);
    output.result = results;
    return callback && callback(null);
  });
}

function authAndPaymentEachUser(user, callback) {
  let partnerOrderNo = user.appointmentId +'__'+ (new Date()).getTime();
  requestMultipayment(partnerOrderNo, user.paymentAmount, user.cardToken, user.expireYm, user.patientName,(err, result)=>{
    console.log("[authAndPaymentEachUser] result:", result);
    let where = {
      '_id': user.appointmentId
    }
    let updateData = {
      'Dpay_partnerOrderNo': partnerOrderNo,
    };
    if (err) updateData.Dpay_paymentLog = err;
    if (result) updateData.Dpay_paymentLog = result;
    AppointmentModel.updateOne(where, {$set: updateData}, {upsert: false}, (err, result)=>{
      if (err) logger.info(`[authAndPaymentEachUser] appointmentId: ${user.appointmentId}, err: ${JSON.stringify(err)}`);
      logger.info(`[authAndPaymentEachUser] appointmentId: ${user.appointmentId}, result: ${JSON.stringify(result)}`);
    });
    if(err) return callback(null, {'userInfo':user,'err':err});
    return callback(null, {'userInfo':user,'result':result});
  });
}  

//requestMultipayment(dpayToken, appointmentId, paymentAmount, cardToken, expireYm, patientName, callback)