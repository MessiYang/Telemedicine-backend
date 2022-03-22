import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import {employee as EmployeeType} from './type/roleType';

let UnnameModel = new BaseModel({
	code:{
		type: String,
		default: 'e'
	},
	//醫生所屬醫院名
	hospital:{
		type: String
	},
	// 姓名
	name: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '姓名資料長度({VALUE})不符'],
		minlength: [1, '姓名資料長度({VALUE})不符'],
		required: [true, '姓名為必填欄位'],
	},
	//大頭照檔名
	photoFileName:{
		type: String
	},
	//簡介
  briefIntro:{
		type: String
	},
	//email
	email:{
		type: String
	},
	//員工編號 
	employeeNumber:{
		type: String,
		index: true,
	},
	// 科別
	department: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '姓名資料長度({VALUE})不符'],
		minlength: [1, '姓名資料長度({VALUE})不符'],
		//required: [true, '門診科別為必填欄位'],
	},
	// (醫院系統用)科別代號
	departmentCode: {
		type: String,
	},
	// (醫院系統用)醫院代號
	hospitalCode: {
		type: String,
	},
	// 手機門號
	mobile: {
		type: String,
		index: true,
		trim: true,
		maxlength: [16, '手機號碼資料長度({VALUE})不符'],
		minlength: [9, '手機號碼資料長度({VALUE})不符'],
	},
	// 授權角色--可複選
	role: [{
		type: Number,
		enum: EmployeeType.toValues(),
	}],
	// accountId
	accountId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Account',
		index: true,
	},
	//是否接受通知 不接受則顯示離線
	isReceiveNotification: {
    type: Boolean,
    default: true,
	},
	//是否在會議中
	isInMeeting: {
		type: Boolean,
		default: false,
	},
	//最新會議開始時間
	meetingStartTime: {
		type: Date
	},
	// 目前會議中的會議Number
	meetingNumber: {
		type: String,
		index: true,
		trim: true,
		ref: 'Appointment'
	},
	// 目前會議中的vidyo會議連結
	currentVidyoRoomUrl: {
		type: String,
		index: true,
	},
	// 目前會議中的vidyo會議pin
	currentVidyoPin: {
		type: String,
		index: true,
	},
	// 最新使用的APP
	appName: {
		type: String,
		index: true,
	},
	isConnectNote: {
		type: String,
		default: '1',
	},
	// 最新使用的APP版本
	version: {
		type: String,
		index: true,
	},
	// 最新使用APP的平台
	platform: {
		type: String,
		index: true,
	},
  // companyId
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
	},
	// 所屬院所群組
	serviceGroupId: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'ServiceGroup',
		index: true,
	}],
	//系統分支標籤
	branchTag:{
		type: String,
		default: 'vidyo'
  },
	//VOIP Token for who have iOS
	voipToken:[{
		type: String,
	}], 
	meetingSystem: {
		type: String,
	},
	//APN Token for who have iOS
	apnToken:[{
      type: String,
  }],
  apnDebugToken:[{
      type: String,
	}],
	fcmToken:[{
		type: String,
	}],
}, {
	'versionKey': false,
	'collection': 'Employee',
});

module.exports = mongoose.model('Employee', UnnameModel);
