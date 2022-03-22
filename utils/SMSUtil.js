import request from 'request';
import {Buffer} from 'buffer';
import logger from '../config/log';

export function sendSMS(mobile, msg, callback){
  let encodedMsg = Buffer.from(msg).toString('base64');
  let mobileStr = String(mobile);
  let xmlData
  xmlData = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
  xmlData+= "<SmsSubmitReq>";
  xmlData+=     "<SysId>FET-8231</SysId>";
  xmlData+=     "<SrcAddress>01916800021165900223</SrcAddress>";
  xmlData+=     "<DestAddress>"+ mobileStr +"</DestAddress>";
  xmlData+=     "<SmsBody>"+ encodedMsg +"</SmsBody>";
  xmlData+=     "<DrFlag>true</DrFlag>";
  xmlData+=     "<FirstFailFlag>false</FirstFailFlag>";
  xmlData+= "</SmsSubmitReq>";
  let url = 'http://61.20.32.60:6600/mpushapi/smssubmit'

  logger.info(`[sendSMS] xmlData: ${xmlData}`);
  request.post(url, {form:{'xml':xmlData}}, (err, response, results)=> {
    if (err) return callback(err, null);     
    let sendSMSResult = {
      'response': response,
      'results': results
    };   
    logger.info(`[sendSMS] sendSMSResult: ${sendSMSResult}`);  
    callback(null, sendSMSResult);
  });
}
