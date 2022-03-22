import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	// 帳號
	zoomAccount: {
		type: String,
		index: true, 
		maxlength: [64, '帳號資料長度({VALUE})不符'],
		minlength: [3, '帳號資料長度({VALUE})不符'],
		//required: [true, '帳號為必填欄位'],
		lowercase: true,
		trim: true,
	},
	// 密碼
	password: {
		type: String,
		maxlength: [64, '密碼資料長度({VALUE})不符'],
		minlength: [5, '密碼資料長度({VALUE})不符'],
		//required: [true, '密碼為必填欄位'],
	},
	//vidyo host, key & appID
	VIDYO_HOST: {
		type: String,
		//required: [true, '必填欄位'],
  },
	VIDYO_KEY: {
		type: String,
		//required: [true, '必填欄位'],
	},
	VIDYO_APPID: {
		type: String,
		//required: [true, '必填欄位'],
	},
  //zoom user Id
  userId: {
		type: String,
  },
  // key & secret
	APIKey: {
		type: String,
		//required: [true, '必填欄位'],
  },
	APISecret: {
		type: String,
		//required: [true, '必填欄位'],
	},  
	SDKKey: {
		type: String,
		//required: [true, '必填欄位'],
	},  
	SDKSecret: {
		type: String,
		//required: [true, '必填欄位'],
	},
  isOccupied: {
    type: Boolean,
    default: false
	},
  // zoom會議Number
	meetingNumber: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '資料長度({VALUE})不符'],
		minlength: [1, '資料長度({VALUE})不符'],
  },	
  // 在使用的醫生_id
  doctorIdUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
		index: true,
		default: null
	},
	// companyId
	companyId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		index: true,
		//required: [true, '必填欄位'],
	},
	//使用期限
	expiryDate:{
		type: Date,
	}

}, {
		'versionKey': false,
		'collection': 'ZoomAccount',
});

UnnameModel.index({zoomAccount: 1});
module.exports = mongoose.model('ZoomAccount', UnnameModel);