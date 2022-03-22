// eslint-disable-next-line no-unused-vars
import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
  {MORNING  : '1', stringValue: {'zh-TW': '上午診', 'en-US': 'morning'}},   
  {AFTERNOON: '2', stringValue: {'zh-TW': '下午診', 'en-US': 'afternoon'}},     
  {NIGHT    : '3', stringValue: {'zh-TW': '夜診'  , 'en-US': 'night'}},    
  {OTHER    : '4', stringValue: {'zh-TW': '其他'  , 'en-US': 'other'}},        
];

module.exports = new Enumeration(value);