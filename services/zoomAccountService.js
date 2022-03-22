import ZoomAccountModel from '../models/zoomAccountModel';
import { listAllZoomUsers } from '../utils/httpUtil';
import RoleType from '../models/type/roleType';
import defaultConf from '../config/defaultConf';

export {
  list,
  createZoomUser,
  saveZoomAccount, 
  update,
};

function list(bean, user, callback){
  let {output} = bean;
  let where = {
    'valid': true
  }
  if(user.role[0] < RoleType.employee.ADM.value) where['companyId'] = user.companyId;
  ZoomAccountModel.find(where)
  .select(' -__target -__targetVer -isOccupied -valid -password')
  .populate({
    path: 'doctorIdUsed',
    select: '_id name companyId email',
    populate: [{
      path: 'accountId',
      select: '_id account',
    },
    {
      path: 'companyId',
      select: '_id displayname code fullname',
    }]
  })
  .populate({
    path: 'companyId',
    select: '_id displayname code fullname',
  })
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result;
    callback && callback(null);
  });
}
function createZoomUser(bean, user, callback){
  let {input} = bean;
  if(user.meetingSystem == "vidyo") return callback && callback(null);
  listAllZoomUsers(input.zoomConfig, (err, result) => {
		if (err) 	return callback && callback(err);
    if (!result) return callback && callback({name: 'CreateError'});
    let userId;
    result.forEach(ele => {
      if(ele.email == input.zoomAccount){
        userId = ele.id
      }
    });
    if(!userId) return callback && callback({name: 'NoZoomAccount'});
    input.userId = userId
		return callback && callback(null);
	});
}

function saveZoomAccount(bean, user, callback) {
  let {input} = bean;
  let data;
  if (user.meetingSystem == "vidyo") {
    data = {
      'zoomAccount': 'USE_VIDYO:'+ (new Date()).getTime(),
      "VIDYO_HOST" : input.vidyoConfig.VIDYO_HOST,
      "VIDYO_KEY" : input.vidyoConfig.VIDYO_KEY,
      "VIDYO_APPID" : input.vidyoConfig.VIDYO_APPID
    }
  }else{
    if(!input.zoomAccount) return callback && callback({name: 'ParamMalformedError'});
    data = {
      'zoomAccount': input.zoomAccount,
      'userId': input.userId,
      'APIKey': input.zoomConfig.ZOOM_API_KEY,
      'APISecret': input.zoomConfig.ZOOM_API_SECRET,
      'SDKKey': input.zoomConfig.ZOOM_SDK_KEY,
      'SDKSecret': input.zoomConfig.ZOOM_SDK_SECRET
    }
  }
  if (input.companyId) data.companyId = input.companyId;
  if (input.doctorIdUsed) data.doctorIdUsed = input.doctorIdUsed;
  if (input.expiryDate) data.expiryDate = input.expiryDate;
  new ZoomAccountModel(data).save((err, result) => {
		if (err) 	return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function update(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.zoomAccountId
  }
  let updateData = input;
  ZoomAccountModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('[clientLogin]  result: ', result);
    return callback && callback(null);
  });
}

