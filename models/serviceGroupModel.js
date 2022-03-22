import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	//服務群組名字
	displayname:{
		type: String,
		required: [true, '服務群組為必填欄位'],
  },
  // 群組內的公司
  companyIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  }],
	// 群組代碼
	code: {
		type: String,
		//index: {unique: true, dropDups: true},
		lowercase: true,
		trim: true,
		maxlength: [64, '群組代碼資料長度({VALUE})不符'],
		minlength: [3, '群組代碼資料長度({VALUE})不符'],
	},
	//此群組使用之視訊系統
	meetingSystem: {
		type: String,
		//index: {unique: true, dropDups: true},
		lowercase: true,
		trim: true,
	},
	// 電話
	phone: {
		type: String,
		trim: true,
		maxlength: [16, '公司電話資料長度({VALUE})不符'],
		minlength: [9, '公司電話資料長度({VALUE})不符'],
	},
	// 地址
	address: {
		type: String,
		trim: true,
		maxlength: [255, '地址已超出字數上限({MAXLENGTH})']
	},
	// 電郵
	email: {
		type: String,
		trim: true,
		maxlength: [255, '電郵已超出字數上限({MAXLENGTH})']
	},
	// 備註
	memo: {
		type: String,
		trim: true,
		maxlength: [255, '備註已超出字數上限({MAXLENGTH})']
	},

}, {
	'versionKey': false,
	'collection': 'ServiceGroup',
});

module.exports = mongoose.model('ServiceGroup', UnnameModel);
