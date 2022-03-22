import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';


let UnnameModel = new BaseModel({
	//區域 北 中 南 離島 東部
	region:{
		type: String,
		required: [true, '區域為必填欄位'],
	},
	//客戶代碼
	clientCode:{
		type: String,
	},
	// (醫院系統用)醫院代號
	hospitalCode: {
		type: String,
	},
	// 公司代碼
	code: {
		type: String,
		index: {unique: true, dropDups: true},
		lowercase: true,
		trim: true,
		maxlength: [64, '公司代碼資料長度({VALUE})不符'],
		minlength: [3, '公司代碼資料長度({VALUE})不符'],
		required: [true, '公司代碼為必填欄位'],
	},
	//(醫院系統用)識別碼
	Identifier: {
		type: String,
	},
	//使用同意書連結
	agreementURL: {
		type: String,
	},
	// 公司簡稱
	displayname: {
		type: String,
		trim: true,
		maxlength: [64, '公司簡稱資料長度({VALUE})不符'],
		minlength: [1, '公司簡稱資料長度({VALUE})不符'],
		required: [true, '公司簡稱為必填欄位'],
	},
	// 公司全名
	fullname: {
		type: String,
		trim: true,
		maxlength: [64, '公司全名資料長度({VALUE})不符'],
		minlength: [1, '公司全名資料長度({VALUE})不符'],
		required: [true, '公司全名為必填欄位'],
	},
	//是開放病患掛號?
	isOpenAppointment: {
		type: Boolean,
		default: true,
	},
	//是開放同步掛號到醫院?
	isSyncAppointment: {
		type: Boolean,
		default: false,
	},
	//同步掛號天數
	syncAppointmentDays: {
		type: Number,
		default: 0
	},
	// 維護人員
	maintenance: {
		type: String,
		trim: true,
		maxlength: [64, '維護人員資料長度({VALUE})不符'],
	},
	// 公司電話
	phone: {
		type: String,
		trim: true,
		maxlength: [16, '公司電話資料長度({VALUE})不符'],
		minlength: [9, '公司電話資料長度({VALUE})不符'],
	},
	// 公司地址
	address: {
		type: String,
		trim: true,
		maxlength: [255, '地址已超出字數上限({MAXLENGTH})']
	},
	// 公司電郵
	email: {
		type: String,
		trim: true,
		maxlength: [255, '電郵已超出字數上限({MAXLENGTH})']
	},
	//帳號數量限制
	accountLimit: {
		type: Number,
		default: 9999
	},
	//門診最高數量限制(停用  ZOOM)
	outpatientLimit: {
		type: Number,
		default: 99999
	},
	// 備註
	memo: {
		type: String,
		trim: true,
		maxlength: [255, '備註已超出字數上限({MAXLENGTH})']
	},

}, {
	'versionKey': false,
	'collection': 'Company',
});
UnnameModel.index({code: 1});

module.exports = mongoose.model('Company', UnnameModel);
