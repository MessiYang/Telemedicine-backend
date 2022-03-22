import ZoomAccountModel from '../models/zoomAccountModel';
import {noonNoToHHMM, suggestTimeToExpectedStartTime, getQueryStartTime, getQueryEndTime } from '../utils/dateUtil';
import RoleType from '../models/type/roleType';
import defaultConf from '../config/defaultConf';

export {
  checkCompanyId,
  checkQueryStartTime,
  checkOutpatientIdAndPatientId,
  checkAppointmentId,
  checkWaitNoAndSuggestTime,
};

function checkCompanyId(bean, callback){
  let {input} = bean;
  //console.log('[checkCompanyId] input.companyList: ', input.companyList);
  if(!input.companyList||!input.companyList.length) return callback && callback({name: 'CompanyNotFound'});
  input.companyId = input.companyList[0]._id;
  input.departmentCode = input.deptCode;
  delete input.companyList;
  return callback && callback(null);

}

function checkQueryStartTime(bean, callback){
  let {input} = bean;
  if(!input.regDateTime||!input.companyCode||!input.noonNo) return callback && callback({name: 'DataNotFound'});
  input.queryStartTime = getQueryStartTime(input.companyCode.toUpperCase(), input.regDateTime, input.noonNo);
  input.queryEndTime = getQueryEndTime(input.companyCode.toUpperCase(), input.regDateTime, input.noonNo);
  //input.queryStartTime = suggestTimeToExpectedStartTime(input.companyCode.toUpperCase(), day[0], noonNoToHHMM(input.companyCode.toUpperCase(), input.noonNo));
  delete input.EmployeeList;
  return callback && callback(null);
}

function checkOutpatientIdAndPatientId(bean, callback) {
  let {input} = bean;
  console.log('[checkOutpatientIdAndPatientId] input: ', input);
  if(!input.outpatientList[0]||!input.outpatientList.length) return callback && callback({name: 'OutpatientNotFound'});
  input.outpatientId = input.outpatientList[0]._id;
  if(!input.customerList[0]||!input.customerList.length) return callback && callback({name: 'CustomerNotFound'});
  input.patientId = input.customerList[0]._id;
  delete input.outpatientList;
  delete input.customerList;
  return callback && callback(null);
}

function checkAppointmentId(bean, callback) {
  let {input} = bean;
  //console.log('[checkAppointmentId] input: ', input);
  if(!input.appointmentList||!input.appointmentList.length) return callback && callback({name: 'DataNotFound'});
  input.appointmentId = input.appointmentList[0]._id;
  delete input.appointmentList;
  return callback && callback(null);
}

function checkWaitNoAndSuggestTime(bean, callback) {
  let {input} = bean;
  input.outpatientData = {};
  let day = input.regDateTime.split(' ');
  input.outpatientData.hospSuggestTime = suggestTimeToExpectedStartTime(input.companyCode.toUpperCase(), day[0], input.suggestTime);
  input.registerResult = {};
  input.registerResult.waitNo = input.waitNo;
  return callback && callback(null);
}