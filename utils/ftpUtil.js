import fs from 'fs';
import Client  from 'ssh2-sftp-client';
import config from 'nconf';
import logger from '../config/log';

const target = config.get('EXECUTE_TARGET');
const {SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD} = config.get(target);

export {
  makeDirAtFTP,
  uploadToFTP,
}

let connectConfig = {
  'host': SFTP_HOST,
  'port': SFTP_PORT,
  'username': SFTP_USER,
  'password': SFTP_PASSWORD, 
  'readyTimeout': 200000,
  'retries': 6,
}

function makeDirAtFTP(companyCode, optType, fileUrl, fileName, callback){
  let sftp = new Client();
  logger.info(`[SFTP] connectFTPServer, connectConfig: ${JSON.stringify(connectConfig)}`);
  let basePath = '/'+companyCode+'/'+companyCode+'/'+optType;
  sftp.connect(connectConfig)
  .then(() => {
    let time = (fileName.split('-'));
    basePath = basePath+'/'+ time[0]+'/'+ time[1]+'/'+ time[2];
    logger.info(`[SFTP] makeDirAtFTP, basePath: ${basePath}`);
    return sftp.exists(basePath);
  })
  .then(data => {
    logger.info(`[SFTP] makeDirAtFTP, sftp.exists(basePath): ${data}`);
    if(data) {
      return;
    }else{
      return sftp.mkdir(basePath, true);
    } 
  })
  .then(() => {
    //logger.info(`[SFTP] upload result, data: ${data}`);
    logger.info(`[SFTP] makeDirAtFTP Done!!!, companyCode: ${companyCode}, fileUrl: ${fileUrl}, fileName: ${fileName}`);
    return sftp.end();
  })
  .then(() => {
    logger.info(`[SFTP] disconnectFTPServer`);
    return callback(null, 'success');
  })
  .catch(err => {
    logger.info(`[SFTP] makeDirAtFTP SFTPerr:`, err);
    return callback(err, null);
  });  
}


function uploadToFTP(companyCode, optType, fileUrl, fileName, callback){
  let sftp = new Client();
  logger.info(`[SFTP] connectFTPServer, connectConfig: ${JSON.stringify(connectConfig)}`);
  let basePath = '/'+companyCode+'/'+companyCode+'/'+optType;
  sftp.connect(connectConfig)
  .then(() => {
    let time = (fileName.split('-'));
    basePath = basePath+'/'+ time[0]+'/'+ time[1]+'/'+ time[2];
    let path = basePath+'/'+fileName;
    logger.info(`[SFTP] check file exist?, path: ${path}`);
    return sftp.exists(path);
  })
  .then(data => {
    if(data) {
      logger.info(`[SFTP] file exist!!!, data: ${data}`);
      return;
    }else{
      let path = basePath+'/'+fileName;
      logger.info(`[SFTP] uploadToFTP, fileUrl: ${fileUrl}, fileName: ${fileName}`);
      return sftp.fastPut(fileUrl, path);
    } 
  })
  .then((data) => {
    logger.info(`[SFTP] upload result, data: ${data}`);
    logger.info(`[SFTP] uploadToFTP Done!!!, companyCode: ${companyCode}, fileUrl: ${fileUrl}, fileName: ${fileName}`);
    return sftp.end();
  })
  .then(() => {
    logger.info(`[SFTP] disconnectFTPServer`);
    return callback(null, 'success');
  })
  .catch(err => {
    logger.info(`[SFTP] uploadToFTP SFTPerr:`, err);
    return callback(err, null);
  });  
} 