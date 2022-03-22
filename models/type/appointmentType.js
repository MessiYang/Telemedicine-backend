// eslint-disable-next-line no-unused-vars
import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
  {UPCOMING  : '0', stringValue: {'zh-TW': '即將來到', 'en-US': 'upcoming'}},  //即將來到
  {REGISTERED: '1', stringValue: {'zh-TW': '已報到'  , 'en-US': 'registered'}},//已報到
  {READY     : '2', stringValue: {'zh-TW': '準備'    , 'en-US': 'ready'}},     //準備
  {LIVING    : '3', stringValue: {'zh-TW': '進行中'  , 'en-US': 'living'}},    //目前進行中
  {END       : '4', stringValue: {'zh-TW': '已結束'  , 'en-US': 'end'}},       //已結束
  {SKIP      : '5', stringValue: {'zh-TW': '過號'    , 'en-US': 'skip'}},      //過號
  {CANCEL    : '8', stringValue: {'zh-TW': '取消'    , 'en-US': 'cancel'}},    //取消
  {CONS      : '9', stringValue: {'zh-TW': '直接會診', 'en-US': 'consultant'}}, //直接會診
  {COMMUN    :'10', stringValue: {'zh-TW': '病情溝通', 'en-US': 'communicate'}},//病情溝通
  {COMMUN_NOT:'11', stringValue: {'zh-TW': '病情溝通_已推播通知', 'en-US': 'communicate_notified'}},//病情溝通 已推播通知
  {COMMUN_END:'12', stringValue: {'zh-TW': '病情溝通_已結束'    , 'en-US': 'communicate_end'}},//病情溝通_已結束
];
module.exports = new Enumeration(value);