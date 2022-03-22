import config from 'nconf';
import async from 'async';
import moment from 'moment';
import logger from '../config/log';
import SocketModel from '../models/socketModel';
const target = config.get('EXECUTE_TARGET');
const {REDIS_HOST} = config.get(target);
const HEARTBEAT_PERIOD = 5;

let io = null;

module.exports = function(server) {
  initialSocketRecord(()=>{
    if (io == null) {
      io = require('socket.io')(server);
      if(REDIS_HOST){
        let redis = require('socket.io-redis');
        io.adapter(redis({ host: REDIS_HOST, port: 6379 }));
        logger.info('[SOCKET-IO] io redis adapter! ');
      }
      io.on('connect', (socket) => {
        logger.info(`[SOCKET_connect] 
          socketId: ${socket.id}, 
          AllSocketsId: ${Object.keys(io.sockets.sockets)}
        `);
        socket.on('disconnect', function (reason) {
          logger.info(`[SOCKET_disconnect] 
            socketId: ${socket.id}, 
            AllSocketsId: ${Object.keys(io.sockets.sockets)}, 
            reason: ${reason} 
          `);
          clientLogOut(socket.id);
        });
        socket.on('login', function (data) {
          if (typeof data != "object") return logger.info('[SOCKET-IO] client login err: data type err! ', data);
          let loginData = JSON.parse(JSON.stringify(data));
          loginData.socketId = socket.id
          logger.info('[SOCKET_login] client login: ', loginData);
          clientLogin(loginData);
        });
        socket.on('heartbeat', function (data) {
          if (typeof data != "object") return logger.info('[SOCKET-IO] client login err: data type err! ', data);
          let heartbeatData = JSON.parse(JSON.stringify(data));
          heartbeatData.socketId = socket.id
          //logger.info('[SOCKET-IO] client heartbeat: ', heartbeatData);
          heartbeatUpdate(heartbeatData);
        });
      })
    }
  });
}

function initialSocketRecord(callback) {
  let where = {
    'socketId': { $ne: '0' }
  }
  let updateData = {
    'socketId': '0'
  }
  SocketModel.updateMany(where, {$set: updateData}, (err, result)=>{
    if (err) return console.log('[clientLogin] err: ', err);
    //console.log('[clientLogin]  result: ', result);
    callback(null);
  });
}

module.exports.getOnlineUserKeys = function(cb) {
  let list = [];
  let nowDate = new Date();
  let where = {
    'socketId': { $ne: '0' },
    'modifyTime': {'$gte': moment(nowDate).subtract(HEARTBEAT_PERIOD*6, 's')},
  }
  SocketModel.find(where)
  .select('-modifyTime -createTime')
  .exec((err, result) => {
    if(err) return cb(err, null);
    if(!result || !result.length) return cb(null, list);
    //console.log('[getOnlineUserKeys] result: ', result );
    result.forEach((element) => {
      if (element.userId) list.push(String(element.userId)); 
    });
    console.log('[getOnlineUserKeys] list: ', list );
    return cb(null, list);
  });
}

module.exports.send = function(userId, topic, message, cb) {
  if (io) {  
    let where = {
      'userId': userId,
      'socketId': { $ne: '0' }
    }
    SocketModel.findOne(where)
    .select('-modifyTime -createTime')
    .exec((err, result) => {
      if(err) return cb('offLine');
      if(!result) return cb('offLine');
      let msgJson = message;
      if(typeof message == "object") msgJson= JSON.stringify(message)
      logger.info(`[SOCKET_send] 
        userId: ${userId}, 
        socketId: ${result.socketId}, 
        topic: ${topic}, 
        message: ${msgJson} 
      `);
      io.to(`${result.socketId}`).emit(topic, message);
      return cb('success');
    });
  }else{
    return cb('offLine');
  }
}

module.exports.sendAll = function(topic, message, cb) {
  //console.log('socketIOUtil sendAll!!!!!');
  io.emit(topic, message);
  return cb('success');
}

function clientLogin(data){
  if(!data.userId) return logger.info('[clientLogin]No userId!!! data:', data);
  let socketIdResult;
  async.series({
    kickoutRepeatLogin: (cb)=> {
      if(!data.deviceId) return cb(null);
      let where = {
        'userId': data.userId,
        'deviceId': {'$ne': data.deviceId}
      };
      SocketModel.findOne(where)
      .exec((err, result) => {
        if(err) return logger.info('[kickoutRepeatLogin] kickoutRepeatLogin err: ', err);
        if(!result) return cb(null);
        //console.log('[kickoutRepeatLogin] : ', result)
        socketIdResult = result.socketId;
        if (socketIdResult == "0" || !socketIdResult){
          cb(null);
        }else{
          const EVENT =  'requestLogout/id/' + data.userId; 
          let msg = {
            'socketId': socketIdResult,
            'newSocketId': data.socketId,
            'deviceId': data.deviceId
          }
          logger.info(`[SOCKET_send] 
            userId: ${data.userId}, 
            socketId: ${socketIdResult}, 
            topic: ${EVENT}, 
            message: ${JSON.stringify(msg)}
          `);
          io.to(`${socketIdResult}`).emit(EVENT, msg);
          cb(null);
        }
      });
    },
    updateNewSocket: (cb)=> {
      let where = {
        'userId': data.userId
      }
      let updateData = {
        'deviceId': data.deviceId,
        'socketId': data.socketId,
        'modifyTime' : new Date()
      }
      SocketModel.updateOne(where, {$set: updateData}, {upsert: true}, (err, result)=>{
        if (err) return logger.info('[clientLogin] updateNewSocket err: ', err);
        // console.log('[clientLogin]  result: ', result);
        // console.log('[clientLogin]  data.userId: ',  data.userId);
        // console.log('[clientLogin]  data.socketId: ',  data.socketId);
        cb(null);
      });
    },
    responseLoginSuccess: (cb)=> {
      const EVENT =  'loginSuccess/id/' + data.userId; 
      let msg = {
        'socketId': data.socketId
      }
      //console.log('[responseLoginSuccess] send!!! socketId: ',data.socketId);
      io.to(`${data.socketId}`).emit(EVENT, msg);
      cb(null);
    },
  }, (err)=> {
    if (err) return logger.info('[clientLogin] err: ', err);
  });
}

function clientLogOut(socketId){
  let where = {
    'socketId': socketId
  }
  let updateData = {
    'socketId': '0'
  }
  SocketModel.updateOne(where, {$set: updateData}, (err, result)=>{
    if (err) return logger.info('[clientLogOut] err: ', err);
    // console.log('[clientLogOut]  result: ', result);
    // console.log('[clientLogOut]  data.userId: ',  socketId);
  });
}

function heartbeatUpdate(data){
  if(!data.userId) return logger.info('[heartbeatUpdate] No userId!!!');
  let where = {
    'userId': data.userId
  }
  let updateData = {
    'socketId': data.socketId,
    'modifyTime' : new Date()
  }
  SocketModel.updateOne(where, {$set: updateData}, {upsert: true}, (err, result)=>{
    if (err) return logger.info('[heartbeatUpdate] updateNewSocket err: ', err);
    // console.log('[heartbeatUpdate]  result: ', result);
    // console.log('[heartbeatUpdate]  data.userId: ',  data.userId);
    // console.log('[heartbeatUpdate]  data.socketId: ',  data.socketId);
  });
}


module.exports.onlineHeartBeat = function(bean, user, callback) {
  let {input} = bean;
  if (!input.socketId) return callback && callback(null);
  let where = {
    'userId': user._id
  }
  let updateData = {
    'socketId': input.socketId,
    'modifyTime' : new Date()
  }
  SocketModel.updateOne(where, {$set: updateData}, {upsert: true}, (err, result)=>{
    if (err) return logger.info('[clientLogin] updateNewSocket err: ', err);
    // console.log('[clientOnlineHeartBeat]  userId: ',  user._id);
    // console.log('[clientOnlineHeartBeat]  socketId: ',  input.socketId);
    return callback && callback(null);
  });
}

module.exports.testSocketLogin = function(userId, callback){
  let loginData = {
    userId: userId,
    socketId: 'SocketIdForTest123456'
  }
  clientLogin(loginData);
  //console.log('[testSocketLogin] login userId: ', userId);
  return callback && callback(null);
}