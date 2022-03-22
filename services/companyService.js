import async from 'async';
import CompanyModel from '../models/companyModel';
import ZoomAccountModel from '../models/zoomAccountModel';
import ServiceGroupModel from '../models/serviceGroupModel';
import DepartmentListModel from '../models/departmentListModel';
import EmployeeModel from '../models/employeeModel';
import RoleType from '../models/type/roleType';
import mongoose from 'mongoose';
let {Types: {ObjectId}} = mongoose;

export {
  listCompany,
  getZoomAccountUsedStatus,
  create,
  update,
  getServiceGroupOfCompanyIds,
  listServiceGroup,
  listCompanyOfServiceGroup,
  getGroupOfEmployee,
  addToGroup,
  removeFromGroup,
  createServiceGroup,
  updateServiceGroup,
  deleteServiceGroup,
  getDepartmentList,
};

//let {Types: {ObjectId}} = mongoose;

function listCompany(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true
  }
  if(input.companyId) where._id = input.companyId;
  where.code = {'$ne': "fetdev2"};
  if(input.companyCode) where.code = input.companyCode.toLowerCase();
  CompanyModel.find(where)
  .select(' -__target -__targetVer -valid')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    input.companyList = result;
    console.log('[listCompany] result:', result);
    addAccountUsedNumber(result, (err, results)=>{
      if (err) return callback && callback(err);
      input.companyList  = results;
      return callback && callback(null);
    });
    // output.result = result;
    //callback && callback(null);
  });
}

function addAccountUsedNumber(companyList, callback){
  async.map(companyList, countAccountNumber, (err, mapResult)=>{
    if (err) return callback(err, null);
    console.log('[addAccountUsedNumber] result:', mapResult);
    return callback(null, mapResult)
  });
  function countAccountNumber(company, cb){
    let data = JSON.parse(JSON.stringify(company))
    if(!company._id) {
      data.accountUsedNumber = 0;
      return cb(null , data);
    }
    let where = {
      'valid': true,
      'companyId': company._id,
      'role': RoleType.employee.DOCTOR.value,
    }  
    EmployeeModel.find(where)
    .countDocuments()
    .exec((err, result) => {
      if(err) return callback && callback(err);
      console.log('[countAccountNumber] result: ', result);
      data.accountUsedNumber = result;
      return cb(null , data);
    });
  }
}

function getZoomAccountUsedStatus(bean, callback){
  let {input, output} = bean;
  let aggregateArray = [];
  let now = new Date;
  aggregateArray.push({
    $match:{
      'valid': true,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'zoomAccount': 1,
      'doctorIdUsed': { $ifNull: [ "$doctorIdUsed", null ] },
      'expiryDate': 1,
      'createTime': 1,
      'companyId':1,
    }
  });
  aggregateArray.push({
    $addFields: {
      'isUsed': {$cond: [{$eq: ['$doctorIdUsed', null]}, 0, 1]},
      'isUnUsed': {$cond: [{$eq: ['$doctorIdUsed', null]}, 1, 0]},
      'isExpiry': {$cond: [{$gte: [now, '$expiryDate']}, 1, 0]},
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$companyId',
      'usedCounts': { $sum: '$isUsed'},
      'unUsedCounts': { $sum: '$isUnUsed'},
      'createTime': { $first: '$createTime'},
      'accountList':{ 
        $push: {zoomAccount: '$zoomAccount', 
        isExpiry: {$cond: [{$eq: ['$isExpiry', 1]}, true, false]},
        isUsed: {$cond: [{$eq: ['$isUsed', 1]}, true, false]}}
      },
    }
  });
  ZoomAccountModel.aggregate(aggregateArray, (err, result)=>{
		if (err) return callback && callback(err);
    if (!result || !result.length) {
      output.result = input.companyList;
      return callback && callback(null);
    }
    let data = [];
    input.companyList.forEach((companyEle) => {
      let pushData = JSON.parse(JSON.stringify(companyEle));
      result.forEach((zoomEle) => {
        if(String(companyEle._id) == String(zoomEle._id)){
          pushData.zoomAccountData = JSON.parse(JSON.stringify(zoomEle));  
        }
      });
      data.push(pushData);
    });
    output.result = data
    return callback && callback(null);
  });
}

function create(bean, callback) {
  let {input} = bean;
  console.log(input);
  input.code = input.code.toLowerCase();
  new CompanyModel(input).save((err, result) => {
		if (err) 	return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function update(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.companyId
  }
  let updateData = input;
  CompanyModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('[clientLogin]  result: ', result);
    return callback && callback(null);
  });
}

function getServiceGroupOfCompanyIds(bean, user, callback){
  console.log('[getServiceGroupOfCompanyIds]  user: ', user);
  let {input} = bean;
  let companyIdArray = [];
  let codeArray = [];
  if(!user.serviceGroupId || !user.serviceGroupId.length){
    let where = {
      'valid': true,
      '_id': user.companyId,
    }
    CompanyModel.findOne(where)
    .select(' -__target -__targetVer -valid')
    .exec((err, result) => {
      if(err) return callback && callback(err);
      if(!result) return callback && callback({name:'DataNotFound'});
      companyIdArray.push(result._id);
      codeArray.push(result.code);
      input.companyIds = companyIdArray;
      input.companyCodes = codeArray;
      console.log('[getServiceGroupOfCompanyIds]~~!!!!!!!  input: ', input);
      return callback && callback(null);
    });
  }else{
    let where = {
      '_id': user.serviceGroupId,
      'valid': true
    }
    ServiceGroupModel.findOne(where)
    .select(' -__target -__targetVer -valid')
    .populate({
      path: 'companyIds',
      select: '_id code displayname',
    })
    .exec((err, result) => {
      if(err) return callback && callback(err);
      if(!result || !result.companyIds) return callback && callback(null);
      result.companyIds.forEach(element => {
        companyIdArray.push(element._id);
        codeArray.push(element.code);
      });
      input.companyData = result.companyIds;
      input.companyIds = companyIdArray;
      input.companyCodes = codeArray;
      console.log('[getServiceGroupOfCompanyIds]  input: ', input);
      callback && callback(null);
    });
  } 
}

function listServiceGroup(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true
  }
  ServiceGroupModel.find(where)
  .select(' -__target -__targetVer -valid -companyIds')
  // .populate({
  //   path: 'companyIds',
  //   select: '_id code displayname',
  // })
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    input.groupList = result;
    //output.result = result;
    callback && callback(null);
  });
}

function listCompanyOfServiceGroup(bean, user, callback){
  let {output} = bean;
  let aggregateArray = [];
  console.log('[listCompanyOfServiceGroup]  user: ', user);
  if(!user.serviceGroupId || !user.serviceGroupId.length) return callback && callback({name: 'DataNotFound'});
  let objIdArray = []
  user.serviceGroupId.map((serviceGroupId)=>{
    objIdArray.push(ObjectId(serviceGroupId));
  })
  aggregateArray.push({
    $match:{
      'valid': true,
      "serviceGroupId": { $in: objIdArray }
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Company',
      'localField': 'companyId',
      'foreignField': '_id',
      'as': 'companyId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$companyId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      //'name': 1,
      'companyId': '$companyId._id',
      'companyCode': '$companyId.code',
      'companyName': '$companyId.displayname',
      //'department': 1,
      //'serviceGroupId': 1,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$companyId',
      'companyName': {$first: '$companyName'}, 
      'companyCode': {$first: '$companyCode'},
    }
  });
  EmployeeModel.aggregate(aggregateArray, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result || !result.length) return callback && callback({name: 'DataNotFound'});
    console.log('[listCompanyOfServiceGroup]  result: ', result);
    output.result = result;
    return callback && callback(null);
  });
}

function getGroupOfEmployee(bean, callback){
  let {input, output} = bean;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      "serviceGroupId": { $exists: true }
    }
  });
  aggregateArray.push({
    $addFields: {
      'serviceGroupIdSize': {$size: '$serviceGroupId'},
    }
  });
  aggregateArray.push({
    $match:{
      'serviceGroupIdSize': { $gt: 0},
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Company',
      'localField': 'companyId',
      'foreignField': '_id',
      'as': 'companyId',
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$companyId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$serviceGroupId',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'name': 1,
      'companyId._id': 1,
      'companyId.code': 1,
      'companyId.displayname': 1,
      'department': 1,
      'serviceGroupId': 1,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$serviceGroupId',
      'doctorList':{ 
        $push: {
          '_id': '$_id', 
          'name': '$name', 
          'department': '$department',
          'companyId': '$companyId',
        }
      },
    }
  });
  EmployeeModel.aggregate(aggregateArray, (err, result)=>{
    if (err) return callback && callback(err);
    console.log('[clientLogin]  result: ', result);
    if (!result || !result.length) {
      output.result = input.groupList;
      return callback && callback(null);
    }
    let data = [];
    input.groupList.forEach((groupEle) => {
      let pushData = JSON.parse(JSON.stringify(groupEle));
      result.forEach((empEle) => {
        if(String(groupEle._id) == String(empEle._id)){
          pushData.doctorList = JSON.parse(JSON.stringify(empEle.doctorList));  
        }
      });
      data.push(pushData);
    });
    output.result = data
    return callback && callback(null);
  });
}

function addToGroup(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true, 
    '_id': {$in: input.employeeIds}
  }
  EmployeeModel.updateMany(where,
  {$addToSet: {'serviceGroupId': input.serviceGroupId}}, {multi: true}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'DataNotFound'});
    console.log('[addDoctorToGroup] result: ', result);
    return callback && callback(null);
  });
}

function removeFromGroup(bean, callback){
  let {input} = bean;
  let where = {
    'valid': true, 
    '_id': input.employeeIds
  }
  EmployeeModel.updateMany(where,
  {$pull: {'serviceGroupId': input.serviceGroupId}}, {multi: true}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'DataNotFound'});
    console.log('[removeFromGroup] result: ', result);
    return callback && callback(null);
  });
}

function createServiceGroup(bean, callback){
  let {input} = bean;
  console.log(input);
  new ServiceGroupModel(input).save((err, result) => {
		if (err) 	return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function updateServiceGroup(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.serviceGroupId
  }
  let updateData = input;
  ServiceGroupModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    console.log('[clientLogin]  result: ', result);
    return callback && callback(null);
  });
}

function deleteServiceGroup(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.serviceGroupId
  }
  let updateData = {
    'valid': false,
    'invalidTime': new Date()
  };
  ServiceGroupModel.update(where, {$set: updateData}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    return callback && callback(null);
  });
}

function getDepartmentList(bean, user, callback){
  console.log('getDepartmentList',  user);
  let {output} = bean;
  let where = {
    'valid': true,
  }
  if(user.role[0] < RoleType.employee.ADM.value) where['companyId'] = user.companyId;
  DepartmentListModel.find(where)
  .select(' -__target -__targetVer -valid')
  .populate({
    path: 'companyId',
    select: '_id code displayname',
  })
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result;
    callback && callback(null);
  });
}
