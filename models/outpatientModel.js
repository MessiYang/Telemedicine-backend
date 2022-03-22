import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import OutpatientType from './type/outpatientType';

let UnnameModel = new BaseModel({
	code: String,
	// 門診科別
	department: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '姓名資料長度({VALUE})不符'],
		minlength: [1, '姓名資料長度({VALUE})不符'],
		required: [true, '門診科別為必填欄位'],
	},
	// 診間代號
	roomCode: {
		type: String,
		index: true,
		trim: true
	},
	//是否適用虛擬健保卡 
	isApplyToVHC: {
		type: Boolean,
    default: false,
	},
	//是否適用DSP支付
	isApplyToDpay: {
		type: Boolean,
    default: false,
	},
	//是否為諮詢門診
	isCounselingClinic: {
		type: Boolean,
    default: false,
	},
	//諮詢門診價格
	counselingPrice: {
		type: Number,
		default: 0
	},
	// 門診開始時間
	startTime: {
		type: Date,
		index: true,
    required: [true, '門診開始時間為必填欄位'],
  },
  // 門診結束時間
	endTime: {
		type: Date,
		index: true,
    required: [true, '門診結束時間為必填欄位'],
  },
  //是否每周重複相同時段門診,  weekly schedule  "1":只持行一次, "0":每周重複
  isOneTime:{  
    type: Boolean,
    //required: [true, '門診結束時間為必填欄位'],
  },
	// 醫師名字
	doctorName: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '姓名資料長度({VALUE})不符'],
		minlength: [1, '姓名資料長度({VALUE})不符'],
		//required: [true, '醫師名字為必填欄位'],
	},
	// 醫師簡介資訊
	doctorIntro: {
		type: String,
		maxlength: [264, '資料長度({VALUE})不符'],
		//minlength: [0, '資料長度({VALUE})不符'],
		//required: [true, '醫師名字為必填欄位'],
	},
  // 醫師employeeId
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true,
  },
  // 護理師employeeId
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true,
  },
	// 門診狀態
	status: {
		type: String,
		index: true,
		trim: true,
		default: OutpatientType.UPCOMING.value,
		enum: OutpatientType.toValues(),
	}, 
	// 目前掛號人數
	signUpNumber: {
		type: Number,
		default: 0
	},  	 
	// 掛號人數限制
	numberLimit: {
		type: Number,
		default: 999
	},  	
}, {
	'versionKey': false,
	'collection': 'Outpatient',
});
delete mongoose.connection.models['Outpatient'];
module.exports = mongoose.model('Outpatient', UnnameModel);