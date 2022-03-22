import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import {customer as CustomerType} from './type/roleType';
import GenderType from './type/genderType';
import {encrypt, decryptString} from '../utils/stringUtil';

let UnnameModel = new BaseModel({
  code:{
		type: String,
		default: 'c'
	},
  // 姓名
  name: {
    type: String,
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
  // 暱稱
  nickname: {
    type: String,
    index: true,
    trim: true,
    maxlength: [16, '姓名資料長度({VALUE})不符'],
    minlength: [1, '姓名資料長度({VALUE})不符'],
  },
  // 性別
  gender: {
    type: String,
    //enum: GenderType.toValues(),
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
  // 生日  "1993-07-19"  yyyy-mm-dd
  birthday:{
		type: String   
	},
  // 身分證號
  personalId: {
    type: String,
    index: true,
    uppercase: true,
    trim: true,
    maxlength: [(64+1+13), '身分證字號資料長度({VALUE})不符'],
    minlength: [3, '身分證字號資料長度({VALUE})不符'],
    //required: [true, '身分證字號為必填欄位'],
  },

  // 手機門號
  mobile: {
    type: String,
    index: true,
    trim: true,
    maxlength: [16, '手機號碼資料長度({VALUE})不符'],
    minlength: [9, '手機號碼資料長度({VALUE})不符'],
    required: [true, '手機門號為必填欄位'],
  },
  // 地址
  address: {
    type: String,
    trim: true,
    maxlength: [255, '地址已超出字數上限({MAXLENGTH})']
  },
  // 備註
  memo: {
    type: String,
    trim: true,
    maxlength: [255, '備註已超出字數上限({MAXLENGTH})']
  },
  // 帳號
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    index: true,
  },

  // 授權角色--可複選
  role: [{
    type: Number,
    //enum: CustomerType.toValues(),
  }],
  //病房
  wardName:{
		type: String,
		index: true,
	},
  //病房號
  wardCode:{
    type: String,
    index: true,
  },
  // 關聯家族成員表
  relationalfamilyMemberID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    index: true,
  },
  //醫病溝通: 與病患的關係
  // relationship:{
  //   type: String
  // },
  //醫病溝通: 是哪個病患的家屬
  // relationalPatientId: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Customer',
  //   index: true,
  // }],
  //醫病溝通: 是主要聯絡人?
  // isMainContact: {
  //   type: Boolean,
  //   default: false,
  // },
  //醫病溝通: 是否接受撥打?
  isReceiveCalling: {
    type: Boolean,
    default: false,
  },
  //VOIP Token for who have iOS
  voipToken:[{
    type: String,
  }], 
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
  // //電子郵件
  // email:{
  //     type: String,
  // },
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
  meetingSystem: {
		type: String,
	},
  isConnectNote: {
		type: String,
		default: '1',
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
	//系統分支標籤
	branchTag:{
		type: String,
    default: 'vidyo'
  },
  // companyId
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },
}, {
  'versionKey': false,
  'collection': 'Customer',
});
UnnameModel.pre('save', function(next) {
	if (this.personalId) {
    this.personalId = encrypt(this.personalId);
    // console.log('personalId encrypt: ',this.personalId );
    // console.log('personalId decrypt: ', decryptString(this.personalId));
  }
  if(this.name){
    this.name = encrypt(this.name);
    // console.log('name encrypt: ',this.name );
    // console.log('name decrypt: ', decryptString(this.name));
  }
	next();
});
module.exports = mongoose.model('Customer', UnnameModel);