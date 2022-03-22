// eslint-disable-next-line no-unused-vars
import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
  {LOGIN        : '1', stringValue: {'zh-TW': '登入'    , 'en-US': 'login'}},   
  {LOGOUT       : '2', stringValue: {'zh-TW': '登出'    , 'en-US': 'logout'}},     
  {CHANGE_PW    : '3', stringValue: {'zh-TW': '更改密碼' , 'en-US': 'change password'}},
  {EXPORT_MR    : '4', stringValue: {'zh-TW': '匯出錄影檔列表' , 'en-US': 'export meeting records'}},      
  {GET_MR       : '5', stringValue: {'zh-TW': '查詢錄影檔紀錄' , 'en-US': 'get meeting records'}},   
  {OTHER        : '0', stringValue: {'zh-TW': '其他'     , 'en-US': 'other'}},        
];

module.exports = new Enumeration(value);