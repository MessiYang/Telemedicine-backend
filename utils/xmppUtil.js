require("babel-core/register");
require("babel-polyfill"); 
import {client, xml} from '@xmpp/client';
//import debug from '@xmpp/debug';
import request from 'request';
import { soap } from 'strong-soap';
import {isJSON} from '../utils/stringUtil';
import logger from '../config/log';
import config from 'nconf';
import os from 'os';
import cluster from 'cluster';

import { listenerCount } from 'process';

export {
  startXmpp,
  xmppSend,
  retrieveAUserSession,
  getAllUserOnlineStatus,
  createAUser,
  setUserPin,
  updateAUser
}
const target = config.get('EXECUTE_TARGET');
const {XMPP_HOST, XMPP_DOMAIN, XMPP_USERNAME, XMPP_PW} = config.get(target);

//const XMPP_HOST = 'localhost';
// const XMPP_HOST = 'ofdev.healthplus.tw';
const XMPP_CLIENT_PORT = '5223';
const XMPP_ADMIN_PORT = '9090';
// const XMPP_DOMAIN = 'ofdev';
// const XMPP_USERNAME = 'telemedicinebackend';
// const XMPP_PW = '123456';
// const XMPP_USERNAME = 'apiserver';
// const XMPP_PW = '123456';

let osHost = 'APIServer_'+ os.hostname().toLowerCase();
if(cluster.worker && cluster.worker.id) osHost = osHost+"__"+cluster.worker.id;
let xmpp = client({
  service: 'xmpps://'+ XMPP_HOST+':'+XMPP_CLIENT_PORT, //'http://127.0.0.1:5222/',
  domain: XMPP_DOMAIN,
  //resource: osHost,
  username: XMPP_USERNAME,
  password: XMPP_PW,
})

// function startXmpp() { 
//   //debug(xmpp, true)
//   xmpp.on('error', err => {
//     logger.info(`[xmpp] err: ${err}`);
//   })
//   xmpp.on('offline', () => {
//     logger.info(`[xmpp] offline!`);
//     logger.info(`[xmpp] xmpp.status: ${xmpp.status}`);
//     //connectOpenFire();
//   })
//   xmpp.on('stanza', async stanza => {
//     if (stanza.is('message')) {
//       logger.info(`[xmpp] stanza: ${stanza.toString()}`);
//       //await xmpp.send(xml('presence', {type: 'unavailable'}))
//       //await xmpp.stop()
//     }
//   })
//   xmpp.on('online', async address => {
//     logger.info(`[xmpp] online! address: ${address.toString()}`);
//     logger.info(`[xmpp] online! os.hostname(): ${os.hostname()}`);  
//     // createAUser(osHost,()=>{
//     //   xmpp.stop()
//     // })
//     // Makes itself available
//     await xmpp.send(xml('presence'))
//   })
//   xmpp.start().catch(console.error)
// }

// function connectOpenFire(){
//   xmpp = client({
//     service: 'xmpp://'+ XMPP_HOST+':'+XMPP_CLIENT_PORT, //'http://127.0.0.1:5222/',
//     domain: XMPP_DOMAIN,
//     resource: 'osHost',
//     username: osHost,
//     password: osHost,
//   })
  
//   xmpp.on('error', err => {
//     logger.info(`[xmpp] err: ${err}`);
//   })
//   xmpp.on('online', async address => {
//     logger.info(`[xmpp] online! address: ${address.toString()}`);
//     // Makes itself available
//     await xmpp.send(xml('presence'))
//   })
//   xmpp.on('offline', () => {
//     logger.info(`[xmpp] offline!`);
//   });
//   xmpp.on('stanza', async stanza => {
//     if (stanza.is('message')) {
//       logger.info(`[xmpp] stanza: ${stanza.toString()}`);
//     }
//   })
//   xmpp.start().catch(console.error)
// }

function xmppSend(userId, topic, message, callback){
  //getAllUserOnlineStatus();
  retrieveAUserSession(userId, (err, result)=>{
    if(err) return callback('offLine');
    console.log('[xmppSend] !!!!!! result:', result);
    let msgData = {};
    msgData.event = topic;
    msgData.data = message;
    if(result && result.presenceStatus == 'Online'){
      const xmppMessage = xml('message',
        {type: 'chat', to: userId+'@'+XMPP_DOMAIN },
        xml('body', {}, JSON.stringify(msgData))
      )
      xmpp.send(xmppMessage);
      logger.info(`[xmppSend] 
        toUserId: ${userId}, 
        topic: ${topic}, 
        message: ${JSON.stringify(msgData)} 
      `);
      return callback('success');
    }else if(result && result.length>1){
      const xmppMessage = xml('message',
        {type: 'chat', to: result[result.length-1].sessionId},
        xml('body', {}, JSON.stringify(msgData))
      )
      xmpp.send(xmppMessage);
      logger.info(`[xmppSend] 
        sessionId: ${result[result.length-1].sessionId}, 
        topic: ${topic}, 
        message: ${JSON.stringify(msgData)} 
      `);
      return callback('success');
    }else{
      return callback('offLine');
    }
  });
}

function retrieveAUserSession(userId, callback) {
  const HOST = XMPP_HOST+':'+XMPP_ADMIN_PORT;
  const url = 'http://' + XMPP_USERNAME + ':' + XMPP_PW + '@'+HOST+'/plugins/restapi/v1/sessions/'+userId;
  request({url}, function (error, response, body) {
    // console.log('[retrieveAUserSession] error:', error);
    // console.log('[retrieveAUserSession] response:', response);
    console.log('[retrieveAUserSession] body:', body);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, body, null);      
    console.log('[retrieveAUserSession] results:', resultJson);
    let sessionData = {};
    if(!resultJson.sessions || !resultJson.sessions.session) return callback(null, null);
    sessionData = resultJson.sessions.session
    callback(null, sessionData);
  });
}

function getAllUserOnlineStatus(callback) {
  const HOST = XMPP_HOST+':'+XMPP_ADMIN_PORT;
  const url = 'http://' + XMPP_USERNAME + ':' + XMPP_PW + '@'+HOST+'/plugins/restapi/v1/sessions';
  console.log('[retrieveAUserSession] url:', url);
  request({url}, function (error, response, body) {
    // console.log('[retrieveAUserSession] error:', error);
    // console.log('[retrieveAUserSession] response:', response);
    console.log('[getAllUserOnlineStatus] body:', body);
    if (!body) return callback({name: 'XMPPNoResponse'}, null);
    let xmlHandler = new soap.XMLHandler();
    let resultJson = xmlHandler.xmlToJson(null, body, null);      
    console.log('[getAllUserOnlineStatus] results:', resultJson);
    let list = [];
    if(!resultJson.sessions || !resultJson.sessions.session) return callback(null, list);
    let sessionData = resultJson.sessions.session
  
    console.log('[getOnlineUserKeys] sessionData: ', sessionData );
    if(Array.isArray(sessionData)){
      sessionData.forEach((element) => {
        if (element.username && element.presenceStatus == 'Online') list.push(String(element.username)); 
      });
    }else{
      if (sessionData.username && sessionData.presenceStatus == 'Online') list.push(String(sessionData.username)); 
    }
    logger.info(`[getOnlineUserKeys] list: ${list}`);
    //console.log('[getOnlineUserKeys] list: ', list );
    callback(null, list);
  });
}

function setUserPin(params) {
  return Number(params)+ Math.pow(10,6);
}

function createAUser(userId, callback) {
  
  const HOST = XMPP_HOST+':'+XMPP_ADMIN_PORT;
  const BODY = {
    "username": userId,
    "password": userId
  }
  let Options = {
    'method': 'POST',
    'url': 'http://' + XMPP_USERNAME + ':' + XMPP_PW + '@'+HOST+'/plugins/restapi/v1/users',
    'body': JSON.stringify(BODY),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  console.log('[Options] Options:', Options);
  request(Options, function (error, response, result) {
    // console.log('[retrieveAUserSession] error:', error);
    console.log('[createAUser] response:', response.statusCode);
    logger.info(`[createAUser] result: ${result}`);
    let resultJson;
    if(response.statusCode=='201' && !result) return callback(null, 'OK');
    if(result){
      if (isJSON(result)) resultJson = JSON.parse(result);  
      if(response.statusCode=='409' &&  resultJson.exception == "UserAlreadyExistsException") return callback(null, 'OK');
      return callback(null, result);
    }else{
      return callback(null, result);
    }
  });
}

function updateAUser(userId, callback) {
  
  const xmppMessage = xml('message',
  {type: 'chat', to: userId+'@'+XMPP_DOMAIN },
  xml('body', {}, JSON.stringify(msgData))
)
  xmpp.send(xmppMessage);
}