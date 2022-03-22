import async from 'async';
import request from 'request';
import config from 'nconf';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import logger from '../config/log';
import ZoomAccountModel from '../models/zoomAccountModel';
import {isJSON} from './stringUtil';

const target = config.get('EXECUTE_TARGET');
const {SIT_URL, DPAY_APIM_HOST, DPAY_FRONTEND_CALLBACK_URL, DPAY_NONPROFILE_HOST, DPAY_CALLERID, DAPY_PRODID, DAPY_PARTNERID, DPAY_CLIENT_ID, DPAY_CLIENT_SECRET} = config.get(target);
//const DPAY_APIM_HOST = 'https://rc.healthplus.tw';

export {
  requestOAuthToken,
  requestCallbackFrontend,
  requestGetConfigID,
  requestMultipayment,
}

function dpayAuthHeader(){
  return 'Basic ' + Buffer.from(DPAY_CLIENT_ID + ':' + DPAY_CLIENT_SECRET).toString('base64');
}

function requestOAuthToken(callback) {
  //let {input} = bean;
  let Options = {
    'url': `https://${DPAY_APIM_HOST}/dsp/main/v1/oauth/token`,
    'headers': {
      'Authorization': dpayAuthHeader(),
      'Content-Type': "application/x-www-form-urlencoded"
    },
    'form': {
      'grant_type': 'client_credentials',
      'scope': '/main/v1'
    }
  };
  console.log('[requestOAuthToken] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);    
    console.log('[requestOAuthToken] results:', results); 
    if (isJSON(results)){ 
      let jsonResult = JSON.parse(results);  
      if(!jsonResult||!jsonResult.access_token) return callback({name:'DataNotFound'}, null);     
      if(!jsonResult.access_token) return callback({printMsg: jsonResult}, null);     
      //input.dpayToken = jsonResult.access_token;
      return callback(null, jsonResult.access_token);
    }
  });
}

function requestCallbackFrontend(status, cfgID, matchCode, callback) {
  let Options = {
    'url': `${DPAY_FRONTEND_CALLBACK_URL}?status=${status}&cfgID=${cfgID}&matchCode=${matchCode}`,
  };
  logger.info(`[requestCallbackFrontend] dpay status: ${status}, cfgID: ${cfgID}, Options: ${JSON.stringify(Options)}`);
  request.get(Options, function(err, response, results) {
    if (err) logger.info(`[requestCallbackFrontend] dpay cfgID: ${cfgID}, err: ${err}`);
    console.log('[requestCallbackFrontend] response.statusCode:', response.statusCode); 
    return callback(null);
  });
}

function requestGetConfigID(callback) {
  let body = {
    'callerId': DAPY_PARTNERID,
    'paymentMethod': "CC",
    'callbackURL': `${SIT_URL}/payment/dpayCallback`,
    'notifyServerURL': `${SIT_URL}/payment/dpayNotifyServer`,
    'prodId': DAPY_PRODID,
    'merchandizeName': "遠傳遠距診療服務",
    'paymentInfo': [
      {
        'paymentMethod': "CC",
        'cc3d': "N"
      }
    ]
  }
  requestOAuthToken((err, dpayToken)=>{
    if (err) return callback(err, null); 
    let Options = {
      'url': `https://${DPAY_APIM_HOST}/dsp/main/v1/intrapay/payUtil/getConfigID?client_id=${DPAY_CLIENT_ID}`,
      'body': JSON.stringify(body),
      'headers': {
        'Authorization': `Bearer ${dpayToken}`,
        'Content-Type': "application/json"
      }
    };
    console.log('[requestGetConfigID] Options:', Options);
    request.post(Options, function(err, response, results) {
      if (err) return callback(err, null);   
      console.log('[requestGetConfigID] results:', results); 
      if (isJSON(results)){ 
        let jsonResult = JSON.parse(results);  
        if(!jsonResult) return  callback({name:'DataNotFound'}, null);     
        if(jsonResult.code!="0000000000") return  callback({printMsg: jsonResult}, null);     
        return callback(null, jsonResult);
      }
    });
  });

}

function requestMultipayment( partnerOrderNo, paymentAmount, cardToken, expireYm, patientName, callback) {
  let body = {
    "callerId": DAPY_PARTNERID, 
    "partnerOrderNo": partnerOrderNo, 
    "partnerId": DAPY_PARTNERID, 
    "prodId": DAPY_PRODID, 
    "merchandizeName": "遠傳遠距診療服務", 
    //"totalAmount":30.00,
    "paymentMethod":"CC",
    //"campaignId":"CAS0000025", 
    "channel":"0103",
    "userInfo": { 
      "srcUserId":"0",   //為nonProfile user, 此欄位必填,請帶0
      //"login":"0955215444" 
      "name": patientName
    },
    "paymentInfo":[{ 
        "paymentMethod":"CC", 
        "amount": paymentAmount, 
        "cardToken": cardToken, 
        "expireYm": expireYm 
      }] 
    }
  requestOAuthToken((err, dpayToken)=>{
    if (err) return callback(err, null); 
    let Options = {
      'url': `https://${DPAY_APIM_HOST}/dsp/main/v1/intrapay/dpay/multipayment?client_id=${DPAY_CLIENT_ID}`,
      'body': JSON.stringify(body),
      'headers': {
        'Authorization': `Bearer ${dpayToken}`,
        'Content-Type': "application/json"
      }
    };
    console.log('[requestMultipayment] Options:', Options);
    request.post(Options, function(err, response, results) {
      if (err) return callback(err, null);   
      console.log('[requestMultipayment] results:', results); 
      if (isJSON(results)){ 
        let jsonResult = JSON.parse(results);  
        if(!jsonResult) return  callback({name:'DataNotFound'}, null);     
        if(jsonResult.code!="0000000000") return  callback({printMsg: jsonResult}, null);     
        return callback(null, jsonResult);
      }
    });
  });
}