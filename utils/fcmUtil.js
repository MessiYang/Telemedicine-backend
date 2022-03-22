import FCM from 'fcm-node';
import logger from '../config/log';

export function fcmSend(isDebug, tokens, alert, payload, msgData, callback) {
  let serverKey = 'AAAAWwdiTCM:APA91bHPamFlUioUJ9IrYV2xvIAOhFLCVnfuPlARrbEM3NPA0I5UzIxZ_aF2Xq8jcwklR4mL09vQ10LYgDGJTw0YuB26D7fTIvIitkGxVEl2QNoduK2SMOAYtkrtpnX0mp-WXVLhu5Wn'; //put your server key here
  let fcm = new FCM(serverKey);
  tokens.forEach(tokenEle => {
    let message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: tokenEle, 
      //collapse_key: 'your_collapse_key',
      ttl: 0,
      priority: "high",
      importance: "high",
      notification: {
        title: alert, 
        body: payload 
      }
    };
    message.data = msgData;
    logger.info(`[FCM] message:${JSON.stringify(message)}`);
    fcm.send(message, function(err, response){
      if (err) {
        logger.info(`[FCM] Something has gone wrong! err: ${err}`);
        //console.log("[fcmSend] Something has gone wrong! err:", err);
      } else {
        logger.info(`[FCM]  Successfully sent with response: ${response}`);
        //console.log("[fcmSend] Successfully sent with response: ", response);
      }
    });
  });
  callback(null);

}