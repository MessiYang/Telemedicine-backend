import async from 'async';
import request from 'request';
import config from 'nconf';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import logger from '../config/log';
import ZoomAccountModel from '../models/zoomAccountModel';
import {isJSON} from '../utils/stringUtil';

const target = config.get('EXECUTE_TARGET');
const {HTTPUTIL_PROTOCOL, HTTPUTIL_HOSTNAME, NODE_PORT, LIST_RECORDING_PAGE_SIZE} = config.get(target);
const RECORDING_CONNECTOR_HOST = 'https://rc.healthplus.tw';

export function post(req, uri, form, cb, cb_request=function(error, response, body){
		if (error) {
			//console.log(`httpUtil-error: ${error}, url:${req.url}`);
			return cb && cb(error, false, null);
		}
		if (response.statusCode == 200) {
			let obj = JSON.parse(body);
			return cb && cb(null, obj.success, obj);
		} else {
			return cb && cb(null, false, null);
		}
	}) {
	let protocol = HTTPUTIL_PROTOCOL || req.protocol;
	let hostname = HTTPUTIL_HOSTNAME || req.hostname;
	let port = NODE_PORT;
	let url = (uri.indexOf('http')==0) ? uri : `${protocol}://${hostname}:${port}${uri}`;
	delete req.headers['content-length'];
	let options = {
		url: url,
		method: 'POST',
		headers: req.headers,
		form: form,
		timeout: 30000,
	};
	request(options, cb_request);
}

export function zoomTokenSign(apiKey, apiSecret) {
	const payload = {
    iss: apiKey,
    exp: ((new Date()).getTime() + 5000)
  };
	const token = jwt.sign(payload, apiSecret);
  //console.log("token: ", token);
  return token
}


export function requestZoomCreateMeeting(user, zoomConfig, callback) {
  const token = "Bearer " + zoomTokenSign(zoomConfig.ZOOM_API_KEY, zoomConfig.ZOOM_API_SECRET);
  let topicStr = 'FET_'+ moment().format("YYYY-MM-DD_HH:mm:ss") +'_'
  if(user.hospitalCode) topicStr = topicStr + user.hospitalCode;
  // if(user.department) topicStr = topicStr + user.department+'_';
  // if(user.name) topicStr = topicStr + user.name;
  let body = {
    "topic": topicStr,
    "type": 2,
    "duration": 24*60,
    "agenda": "FET telemedicine",
    "settings": {
      "host_video": true,
      "participant_video": true,
      "audio": "voip",
      "join_before_host": true,
      "auto_recording": "cloud"
    }
  }
  let Options = {
    'url': 'https://api.zoom.us/v2/users/' + zoomConfig.ZOOM_USERID + '/meetings',
    'body': JSON.stringify(body),
    'headers': {
      'Authorization': token,
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestZoomCreateMeeting] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);     
    let meetingNumberResult = JSON.parse(results);  
    if(!meetingNumberResult || !meetingNumberResult.id) return  callback({name:'ZoomErr'}, null);     
    //console.log('[createMeetingRoom] meetingNumberResult:', meetingNumberResult);
    let data = meetingNumberResult;
    data.zoomConfig = zoomConfig;
    data.meetingData = {
      'meetingNumber': String(meetingNumberResult.id),
      'startTime': moment(meetingNumberResult.start_time)
    }
    //console.log('[requestZoomCreateMeeting] data:', data);
    callback(null, data);
  });
}

export function requestCreateZoomUser(zoomConfig, email, callback) {
  const token = "Bearer " + zoomTokenSign(zoomConfig.ZOOM_API_KEY, zoomConfig.ZOOM_API_SECRET);
  let body = {
    "action": "create",
    "user_info": {
      "email": email,
      "type": 3,
      "first_name": email.slice(0,email.indexOf("@")),
      "last_name": 'FET'
    }
  }
  let Options = {
    'url': 'https://api.zoom.us/v2/users',
    'body': JSON.stringify(body),
    'headers': {
      'Authorization': token,
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestCreateZoomUser] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);     
    let userResult = JSON.parse(results);  
    if(!userResult || !userResult.id) return  callback({name:'ZoomErr'}, null);     
    //console.log('[requestCreateZoomUser] userResult:', userResult);
    callback(null, userResult);
  });
}
export function listAllZoomUsers(zoomConfig, callback){
  let page_count = 0;
  let page_number = 0;
  let page = 1;
  let userLists = [];
  async.doDuring(
    (cb)=>{
      requestListUsers(zoomConfig, page, (err, result)=>{
        if (err) return cb(err, null);
        if(result && result.users){
          //console.log('[requestListUsers] result.users.length:', result.users.length);
          page_count = result.page_count;
          page_number =  result.page_number;
          page = page+1;
          userLists = userLists.concat(result.users);
        }
        cb();
      });
    },
    (cb)=>{  //post-check
      return cb(null, (page_number < page_count));
    },
    ()=>{
      //console.log("============== [listAllZoomUsers] finish!!! userLists: ", userLists.length);
      return callback(null, userLists);
    }
  );	
}
function requestListUsers(zoomConfig, page, callback) {
  const token = "Bearer " + zoomTokenSign(zoomConfig.ZOOM_API_KEY, zoomConfig.ZOOM_API_SECRET);
  let Options = {
    'url': 'https://api.zoom.us/v2/users?page_number='+page+'&page_size=300&status=active',
    'headers': {
      'Authorization': token
    }
  };
  request.get(Options, function(err, response, results) {
    if (err) return callback(err, null);
    if(!results) return callback({name:'NoLiveMeeting'}, null);
    let data = JSON.parse(results);
    callback(null, data);
  });
}

export function requestEndZoomMeeting(zoomConfig, meetingId, callback) {
  const token = "Bearer " + zoomTokenSign(zoomConfig.ZOOM_API_KEY, zoomConfig.ZOOM_API_SECRET);
  let body = {
    "action": 'end'
  }
  let Options = {
    'url': 'https://api.zoom.us/v2/meetings/' + meetingId + '/status',
    'body': JSON.stringify(body),
    'headers': {
      'Authorization': token,
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestEndZoomMeeting] Options:', Options);
  request.put(Options, function(err, response, results) {
    if (err) return callback(err, null);
    if (results) return callback({name:'ZoomErr'}, null);   
    callback(null, results);
  });
}

export function requestDeleteZoomMeeting(zoomConfig, meetingId, callback) {
  const token = "Bearer " + zoomTokenSign(zoomConfig.ZOOM_API_KEY, zoomConfig.ZOOM_API_SECRET);
  let Options = {
    'url': 'https://api.zoom.us/v2/meetings/' + meetingId,
    'headers': {
      'Authorization': token
    }
  };
  //console.log('[requestDeleteZoomMeeting] Options:', Options);
  request.delete(Options, function(err, response, results) {
    if (err) {
      return callback(err, null);
    }
    if(!results){
      return callback(null, null);
    }
    callback(null, JSON.parse(results));
  });
}

export function requestLiveMeetingList(zoomConfig, callback){
  const token = "Bearer " + zoomTokenSign(zoomConfig.ZOOM_API_KEY, zoomConfig.ZOOM_API_SECRET);
  let Options = {
    'url': 'https://api.zoom.us/v2/users/'+ zoomConfig.ZOOM_USERID +'/meetings?page_number=1&page_size=30&type=live',
    'headers': {
      'Authorization': token
    }
  };
  request.get(Options, function(err, response, results) {
    if (err) return callback(err, null);
    if(!results) return callback({name:'NoLiveMeeting'}, null);
    let data = JSON.parse(results);
    callback(null, data);
  });
}

export function requestListAllRecordings(queryDay, nextPageToken, zoomConfig, callback) {
  const token = "Bearer " + zoomTokenSign(zoomConfig.APIKey, zoomConfig.APISecret);
  let query = 'trash_type=meeting_recordings&mc=false' + '&to='+ queryDay + '&from='+ queryDay + '&page_size='+ String(LIST_RECORDING_PAGE_SIZE)
  if(nextPageToken) query = query+'&next_page_token='+nextPageToken;
  let Options = {
    'url': 'https://api.zoom.us/v2/users/' + zoomConfig.userId + '/recordings?' + query,
    'headers': {
      'Authorization': token,
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestListAllRecordings] Options:', Options);
  request.get(Options, function(err, response, results) {
    if (err) return callback(err, null);     
    let data = JSON.parse(results);
    //console.log('[requestListAllRecordings] results:', data);
    callback(null, data);
  });
}

export function initialZoomAccounts(companyId){
  let needSyncZoom = false;
  let zoomAccountsResult
  async.series({
    getZoomAccounts: function(cb) {
      let where = {
        'valid': true,
        //'isOccupied': true,
        'companyId': companyId
      }; 
      ZoomAccountModel.find(where).exec((err, result) => {
        if (err) {
          return logger.info('[initialZoomAccounts] getZoomAccounts err:', err);
        } else if (!result || !result.length) {
          //console.log('[initialZoomAccounts] no need sync!');
          cb();
        } else {
          needSyncZoom = true;
          zoomAccountsResult = result;
          cb();
        }
      });
    },
    checkEachAccountLiveMeeting: function(cb) {
      if(needSyncZoom){ 
        async.map(zoomAccountsResult, checkEachAccountLiveMeeting, (err, result)=>{
          if (err) return logger.info('[initialZoomAccounts]checkEachAccountLiveMeeting err:', err);
          //console.log('[initialZoomAccounts]checkEachAccountLiveMeeting result: ', result);
          cb();
        });
      }else cb();
    }
   }, function(err) {
     if (err) return logger.info('[initialZoomAccounts] err:', err);
     logger.info('[initialZoomAccounts] job end ...');
   });   

}

function checkEachAccountLiveMeeting(zoomData, callback) {
  const token = "Bearer " + zoomTokenSign(zoomData.APIKey, zoomData.APISecret);
  let Options = {
    'url': 'https://api.zoom.us/v2/users/'+ zoomData.userId +'/meetings?page_number=1&page_size=30&type=live',
    'headers': {
      'Authorization': token
    }
  };
  request.get(Options, function(err, response, results) {
    if (err) return callback(err, null);
    if(!results) return callback(null, null);
    let updateData;
    let data = JSON.parse(results);
    //console.log('[checkEachAccountLiveMeeting] data:', data);
    if(data.meetings.length){
      updateData = {
        'isOccupied': true,
      };
    }else{
      updateData = {
        'meetingNumber': 'null',
        'isOccupied': false,
      };
    }
    ZoomAccountModel.findOneAndUpdate({'_id': zoomData._id}, updateData, (err, updateResult)=>{
      if (err) return callback(err, null);
      //console.log('[updateZoomAccount] updateResult:', updateResult);
      if(!updateResult) return callback('No updateResult.', null);
      return callback(null, updateResult);
    });  
  });
}

export function requestGetFilesUrl(meetingNumber, startTime, callback) {
  let body = {
    "meetingNumber": meetingNumber,
    "startTime": startTime
  }
  let Options = {
    'url': RECORDING_CONNECTOR_HOST + '/recording/getFilesUrl',
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestGetFilesUrl] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);     
    let urlResult = null;
    if (isJSON(results)){ 
    urlResult = JSON.parse(results);  
    } 
    if(!urlResult || !urlResult.data|| !urlResult.data.length) return  callback({name:'NoRecordingFile'}, null);     
    //console.log('[requestGetFilesUrl] urlResult:', urlResult);
    callback(null, urlResult);
  });
}

export function requestGetRegScheduleByRegDate(companyCode, token, callback) {
  let body = {
    "token": token,
    "regDateTime": moment().utc().format("YYYY-MM-DD HH:mm"),
    "hospital" : companyCode
  }
  let Options = {
    //'url': 'http://telemed-mysql.taipei.cloudapp.fetazure.fetnet.net:8888/telemed/appointment/getRegScheduleByRegDate',
    'url':'https://telemw.healthplus.tw/telemed/v1.0.0/appointment/getRegScheduleByRegDate',    
    "rejectUnauthorized": false,
    'body': JSON.stringify(body),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestGetRegScheduleByRegDate] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);
    //console.log('[requestGetRegScheduleByRegDate] @@@@@@@@@@@@@@@@ result:', results);
    let doctorResults;   
    //     let test = [{"noonNo":"1","doctorId":"920273","hospital":"KMUH","deptCode":"0654","status":"done"},
    // {"noonNo":"1","doctorId":"1030557","hospital":"KMUH","deptCode":"0954","status":"done"}];
    // let test = [{"noonNo":"1","doctorId":"總醫師","hospital":"KMUH","deptCode":"0554","status":"done"},
    //{"noonNo":"1","doctorId":"總醫師","hospital":"KMUH","deptCode":"0954","status":"done"}];
    // let test = {'status': "failed"};
    if (isJSON(results)){
      doctorResults = JSON.parse(results); 
    }else if (results && results.length){
      doctorResults = results;
    }else {
      doctorResults = {'status': "failed"}
    }
    //console.log('[requestGetRegScheduleByRegDate] doctorResults:', doctorResults);
    callback(null, doctorResults);
  });
}

export function requestGoogleSiteVerify(secret, response, callback) {
  let Options = {
    'url': 'https://www.google.com/recaptcha/api/siteverify?secret='+secret+'&response='+String(response),
    'headers': {
      'Content-Type': "application/json"
    }
  };
  //console.log('[requestGoogleSiteVerify] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) return callback(err, null);
    callback(null, results);
  });
}

