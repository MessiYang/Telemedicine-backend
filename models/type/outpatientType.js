// eslint-disable-next-line no-unused-vars
import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
  {UPCOMING  : '1', stringValue: {'zh-TW': '即將來到', 'en-US': 'upcoming'}},   //即將來到
  {READY     : '2', stringValue: {'zh-TW': '準備', 'en-US': 'ready'}},      //準備中: 病人可開始報到 已建立meetingRoom
  {LIVING    : '3', stringValue: {'zh-TW': '進行中', 'en-US': 'living'}},     //目前進行中: 醫生端已取得meeting number
  {END       : '4', stringValue: {'zh-TW': '已結束', 'en-US': 'end'}},        //已結束: 醫生端已結束meeting
];

module.exports = new Enumeration(value);