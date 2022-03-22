import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import AppointmentType from './type/appointmentType';

//定義掛號相關資料
let UnnameModel = new BaseModel({
  // 掛號號碼
	sequence: {
		type: Number,
    //required: [true, '掛號順位為必填欄位'],
	},
	// 排序用號碼
	sortNumber: {
		type: Number,
    //required: [true, '掛號順位為必填欄位'],
  },
  // 預計開始時間
	expectedStartTime: {
		type: Date,
    //required: [true, '掛號順位為必填欄位'],
  },
	// 預計結束時間
	expectedEndTime: {
		type: Date,
		//required: [true, '掛號順位為必填欄位'],
	},
	// 備註
	remark: {
		type: String,
  },
  // 掛號的病患
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
	},
	// (高醫客製用)掛號的身分證
	patientPID: {
		type: String,
	},
	//虛擬健保卡Token
	VHCToken: {
		type: String,
	},	
	// QRCodeData
	patientQRCodeData: {
		type: String,
	},	
	// 直接會診時的主治醫生
	doctorId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		index: true,
	},
	// 會診醫生
	consultantDoctorId: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		index: true,
	}],
  // 掛號的門診Id
  outpatientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outpatient',
    index: true,
  },
	// 掛號的狀態
	status: {
		type: String,
		index: true,
		trim: true,
		default: AppointmentType.UPCOMING.value,
		enum: AppointmentType.toValues(),
	},
	//是否已報到
	isCheckIn: {
		type: Boolean,
    default: false,
	},
	//需授權付款
	needAuthPayment: {
		type: Boolean,
		default: false,
	},
	isAcceptInviteMeeting: {
		type: Boolean,
    default: false,
	},
	// vidyo會議連結
	vidyoRoomUrl: {
		type: String,
		index: true,
	},
	// vidyo會議pin
	vidyoPin: {
		type: String,
		index: true,
	},
	// vidyo會議ID
	vidyoRoomID: {
		type: String,
		index: true,
	},
  // vidyo會議資料
	vidyoToken: {
		type: String,
		index: true,
	},
	// vidyo會議資料
	vidyoHost: {
		type: String,
		index: true,
	},
	// vidyo會議資料
	vidyoResourceId: {
		type: String,
		index: true,
	},
	// 會議錄影紀錄Id
	meetingRecordId: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'MeetingRecord',
		index: true,
	}],
   // 最後一個zoom會議Number
	meetingNumber: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '資料長度({VALUE})不符'],
		minlength: [1, '資料長度({VALUE})不符'],
	},
	// 所有zoom會議的資訊
	meetingData: [{
		meetingNumber: {
			type: String,
			index: true,
			trim: true,
			maxlength: [64, '資料長度({VALUE})不符'],
			minlength: [1, '資料長度({VALUE})不符'],
		},
		startTime: {
			type: Date
		}
	}],
  // zoom會議UUID
	meetingUUID: [{
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '資料長度({VALUE})不符'],
		minlength: [1, '資料長度({VALUE})不符'],
	}],
	//DSP金流 設定序號(有效性是15分鐘)
	Dpay_cfgID: {
		type: String,
		index: true,
	},
	//DSP金流 信用卡Token
	Dpay_cardToken: {
		type: String,
	},
	//DSP金流 卡片到期年月YYYYMM
	Dpay_expireYm: {
		type: String,
	},
	//DSP金流 成功才回傳 比對值
	Dpay_matchCode: {
		type: String,
		index: true,
	},
	//DSP金流 醫院報價金額
	Dpay_paymentAmount: {
		type: Number,
	},
	//DSP金流 扣款交易碼(作為查詢扣款紀錄用)
	Dpay_partnerOrderNo: {
		type: String,
		index: true,
	},
	//DSP金流 扣款回應訊息
	Dpay_paymentLog: {
		type: Object
	},
	// //DSP金流 是否完成扣款
	// Dpay_isSuccessPay: {
	// 	type: Boolean,
  //   default: false,
	// },
	// depay明細
	dpayDetailId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'DpayDetail',
		index: true,
	},
}, {
	'versionKey': false,
	'collection': 'Appointment',
});

module.exports = mongoose.model('Appointment', UnnameModel);