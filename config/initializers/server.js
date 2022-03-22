import express from 'express';
import cors from 'cors';
// Local dependecies
import config from 'nconf';
// protect from some well-known web vulnerabilities by setting HTTP headers appropriately
import helmet from 'helmet';
// create the express app
// configure middlewares
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import multipart from 'connect-multiparty';
import morgan from 'morgan';
import moment from 'moment';
import logger from '../log';
import { mongo } from './database';
//session with mongo
import session from 'express-session';
import {isJSON, hideDataString} from '../../utils/stringUtil';
import {startXmpp} from '../../utils/xmppUtil';

const MongoStore = require('connect-mongo')(session);
const target = config.get('EXECUTE_TARGET');
const {COOKIE_WITH_SECURE, NODE_PORT} = config.get(target);

let app;

let start =  function(cb) {
  'use strict';
  //Set console log valid
  if (target!='LOCAL') console.log=function(){};

  // Configure express
  app = express();

  //Config for CORS enabled.
  app.use(cors());
  app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });

  app.use(helmet({
    frameguard: false,
    xssFilter: false,
    noSniff: false
  }));

  //log format def.
  app.use(function (req, res, next) {
    var originalSend = res.send;
    res.send = function (body) { // res.send() 和 res.json() 都會攔截到
      res.__body_response = body;
      originalSend.call(this, body);
    }
    next();
  });

  app.use(morgan(function (tokens, req, res) {
    if (req.headers.scope === '_id') return;
    let reqBody;
    if(req.body) {
      reqBody = JSON.parse(JSON.stringify(req.body)) 
      
      if(reqBody.token) delete reqBody.token;
      if(reqBody.patientPID) reqBody.patientPID = hideDataString(reqBody.patientPID);
      if(reqBody.account && reqBody.account.substr(0,2)=="09") reqBody.account = hideDataString(reqBody.account);
      if(reqBody.user){
        if(reqBody.user.name && reqBody.user.name == 'AdministratorDEV2') return;
        if(reqBody.user.name && reqBody.user.role == [8192]) return;
        if(reqBody.user.name) reqBody.user.name = hideDataString(reqBody.user.name);
        if(reqBody.user.mobile) reqBody.user.mobile = hideDataString(reqBody.user.mobile);
        if(reqBody.user.personalId) reqBody.user.personalId = hideDataString(reqBody.user.personalId);
      }
    }
    let logData = {
      'METHOD': tokens.method(req, res),
      'API_NAME': req.originalUrl,
      'STATUS': tokens.status(req, res),
      'HOSTNAME': req.hostname,
      'BODY': reqBody,
      'USER_AGENT': tokens['user-agent'](req, res),
      'REMOTE_ADDR': tokens['remote-addr'](req, res),
      'START_TIME': moment(req.requestTime).format(),
      'DURATION': tokens['response-time'](req, res),
      'SIZE': tokens.res(req, res, 'content-length'),
      'MESSAGE': res.statusMessage,
    }
    if (isJSON(res.__body_response)){
      let bodyMsg = JSON.parse(res.__body_response)
      logData.RESPONSE = bodyMsg;
    }else{
      logData.RESPONSE = res.__body_response;
    }
    logger.info('[API] '+JSON.stringify(logData));
    return 
  }));
  app.use(bodyParser.json({limit: '500mb'}));
  app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));
  // app.use(bodyParser.json());
  // app.use(bodyParser.urlencoded({"extended" : false}));
  app.use(cookieParser());
  app.use(multipart());
  //config view engine
  // app.set('views', 'views');
  // app.set('view engine', 'ejs');
  // setting session
  // const sessionConfig = {
  //   //secret : config.get('SESSION_SCT'),
  //   store : new MongoStore({ mongooseConnection: mongo.connection, ttl: config.get('SESSION_TIMEOUT')}),
  //   resave: true,
  //   saveUninitialized: true,
  //   rolling: true,
  //   cookie: { httpOnly: true },
  //   name: `${config.get('SESSION_SCT')}.sid`,
  // }

  if (COOKIE_WITH_SECURE === true) {
    logger.info('[SERVER] Run with secure cookie');
    app.set('trust proxy', 1) // trust first proxy
    // sessionConfig.cookie.secure = true // serve secure cookies
  }

  // app.use(session(sessionConfig));

  logger.info('[SERVER] Initializing routes');
  app.use(express.static('public'));
  // 將上傳的資料設定為static 方便讀取
  app.use(express.static('resources'));
  // get all controllers
  require('../../routes/index')(app);

  // Error handler
  //app.use(function(err, req, res, next) {
  app.use(function(err, req, res) {
    /*switch (err.name) {
      case 'SyntaxError':
      case 'UnauthorizedError':
      case 'BadRequestError':
      case 'UnauthorizedAccessError':
      case 'NotFoundError':
        break;
    }*/
    if (app.get('env') === 'development') {
      console.log(err);
    } else {
      logger.info(`[SERVER] ${err.toString()}`);
      console.log(err);
    }
    res.status(err.status || 500);
    res.json({
      success: false,
      errors: {system: {message: (err.name || 'Internal Server Error')}},
      code: '99999',
    });
  });

  //let server = app.listen(NODE_PORT);
  let server = app.listen(NODE_PORT);
  logger.info('[SERVER] Listening on port ' + NODE_PORT);

  // initial socket.io
  // require('../../utils/socketIOUtil')(server);
  // initial xmpp
  startXmpp();

  if (cb) {
    return cb();
  }
};

module.exports = start;
