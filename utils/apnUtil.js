import apn from 'apn';
import config from 'nconf';
import logger from '../config/log';

const target = config.get('EXECUTE_TARGET');
const {APNS_IS_PROD, VOIP_CERT, VOIP_KEY, VOIP_PASSPHRASE} = config.get(target);

export function apnSend(isDebug, tokens, title, payload, msgData, role, callback) {
  let service, topic;
  let options = {
    token: {
      key: "./config/apns/AuthKey.p8",
      keyId: "H47FD6J2Q9",
      teamId: "87LC36G5W6"
    },
    production: false
  };
  console.log("target:", target);
  //if (APNS_IS_PROD) isDebug = false;
  if (isDebug){
    console.log('[apnSend]  isDebug!!')
    options.production = false;
  }else{
    console.log('[apnSend]  isProd!!')
    options.production = true;
  }
  if(target == "PROD") {
    topic = "net.fetnet.telemedicine.patient.prod";
    if (role == 'e') {
      topic = "net.fetnet.telemedicine";
    }
  }else{
    topic = "net.fetnet.telemedicine.patient.prod";
    if (role == 'e') {
      topic = "net.fetnet.telemedicine";
    }
  }
  service = new apn.Provider(options);
  let note = new apn.Notification({
    'alert': payload,
  });
  let titleStr = payload;
  if(title)  titleStr = title;
  //note.type = (req.type) ? req.type : "[test] apn 1";
  note.aps = {
      "alert" : {
          "title" : titleStr,
          "body" : payload
      }
  };
  note.topic = topic;
  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.badge = 0;
  note.sound = "ping.aiff";
  note.payload = msgData;  //add here
  //console.log(`APN: note  ${note.topic}`);
  // note.payload = req.alert; //req.payload;
  // tokens.forEach( (entry) => {
  //   console.log(`APN: token ${entry}`);
  // });
  //console.log(`Sending: ${note.compile()} to ${tokens}`);
  logger.info(`[APN] note:${JSON.stringify(note)}`);
  service.send(note, tokens).then( result => {
    //console.log("sent:", result.sent.length);
    result.sent.forEach( (entry) => {
      logger.info(`[APN] Successfully sent:${JSON.stringify(entry)}`);
    });

    //console.log("failed:", result.failed.length);
    result.failed.forEach( (entry) => {
      logger.info(`[APN] failed:${JSON.stringify(entry)}`);
    });
    callback(null);
  });
}

export function voipSend(isDebug, tokens, payload, msgData, callback) {
  let service;
  let options = {
    cert: "./config/apns/"+VOIP_CERT,
    key: "./config/apns/"+VOIP_KEY,
    passphrase: VOIP_PASSPHRASE, 
  };
  if (APNS_IS_PROD) isDebug = false;
  if (isDebug){
    options.production = false;
    console.log('[apnSend]  isDebug!! for Xcode building test')
  }else{
    options.production = true;
  }
  logger.info('[APN] voipSend options!!', options)
  service = new apn.Provider(options);
  let note = new apn.Notification({
    'alert': payload,
  });
  note.aps = {
      "alert" : {
          "title" : payload,
          "body" : payload
      }
  };
  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.payload = msgData;  //add here

  logger.info(`[APN] voipSend note:${JSON.stringify(note)}`);
  service.send(note, tokens).then( result => {
    result.sent.forEach( (entry) => {
      logger.info(`[APN] voipSend sent:${JSON.stringify(entry)}`);
    });

    result.failed.forEach( (entry) => {
      logger.info(`[APN] voipSend failed:${JSON.stringify(entry)}`);
    });
    console.log("sent:", result.sent.length);
    console.log("failed:", result.failed.length);
    callback(null);
  });
}