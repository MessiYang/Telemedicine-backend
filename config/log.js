import fs from 'fs';
import os from 'os';
import path from 'path';
import moment from 'moment';
import winston from 'winston';
import dailyRotateFile from 'winston-daily-rotate-file';

const logDirectory = 'logs';
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
['error','exception','info','system'].forEach((dirName) => {
  fs.existsSync(path.join(logDirectory,dirName)) || fs.mkdirSync(path.join(logDirectory,dirName));
});

// error, info message format
let logFormatter = function(options) {
  return options.timestamp() +'['+ options.level.toUpperCase() +']['+ os.hostname() +'] - '+'[Backend]' +
    (undefined !== options.message ? options.message : '') +
    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
  // return options.level.toUpperCase() + ' ' + options.timestamp() + ' - ' +
  //   (undefined !== options.message ? options.message : '') +
  //   (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
}
// exception handler message format
let exceptionFormatter = function(options) {
  let stack = '';
  if (options.meta && undefined !== options.meta.stack) {
    stack = options.meta.stack.map(function(error) {
      return error + '\n\t';
    });
  }
  return options.timestamp() +'['+ options.level.toUpperCase() +']['+ os.hostname() +'] - '+'[Backend]' +
  //'EXCEPTION ' + options.timestamp() + ' - ' +
    (undefined !== options.message ? options.message : '') + '\n\t' + stack;
}
// time format
let logTime = function() {
  //return (new Date()).toLocaleString();
  return '['+moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ')+']';
};

let logger = new(winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: true,
      timestamp: logTime,
      formatter: logFormatter,
    }),
    new (dailyRotateFile)({
      name: 'info-file',
      filename: 'logs/info/info.log',
      datePattern: '.yyyy-MM-dd',
      level: 'info',
      json: false,
      timestamp: logTime,
      formatter: logFormatter,
    }),
    new (dailyRotateFile)({
      name: 'error-file',
      filename: 'logs/error/error.log',
      datePattern: '.yyyy-MM-dd',
      level: 'error',
      json: false,
      timestamp: logTime,
      formatter: logFormatter,
    }),
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: true,
      timestamp: logTime,
      formatter: exceptionFormatter,
    }),
    new (dailyRotateFile)({
      name: 'exception-file',
      filename: 'logs/exception/exception.log',
      datePattern: '.yyyy-MM-dd',
      json: false,
      timestamp: logTime,
      formatter: exceptionFormatter,
    }),
  ]
});

module.exports = logger;
