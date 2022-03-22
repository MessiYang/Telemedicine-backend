import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

//定義掛號相關資料
let UnnameModel = new BaseModel({
  // 掛號號碼
	sequence: {
		type: Number,
    //required: [true, '掛號順位為必填欄位'],
	},
	// 等候順位
	waitNo: {
		type: Number,
		//required: [true, '等候順位為必填欄位'],
	},
  // 掛號日期
	appointmentDate: {
		type: Date,
    //required: [true, '掛號順位為必填欄位'],
	},
	// 診間號
	room: {
		type: String,
	},
	// 病歷號
	mrno: {
		type: String,
	},
  // (高醫客製用)掛號的身分證
	patientPID: {
		type: String,
	},
	// 病患所屬醫院
	patientHospital: {
		type: String,
	},
	// (醫院系統用)科別代號
	departmentCode: {
		type: String,
	},
	// 病患中文名字
	patientChName: {
		type: String,
	},
	// 病患手機
	patientMobile: {
		type: String,
	},
	// 建議時間
	suggestTime: {
		type: String,
	},
	// 掛號碼
	appointmentNumber: {
		type: String,
	},
	// 遠距種類
	telemedicineType: {
		type: String,
	},
	// 暫用資料1
	data1: {
		type: String,
	},
	// 暫用資料1
	data2: {
		type: String,
	},
	// 直接會診時的主治醫生
	doctorId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		index: true,
	},
  // 掛號的病患
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
	},
	// 操作者_id
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		index: true,
	},
	// 會診醫生
	consultantDoctorId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		index: true,
	},
	// 主醫生的companyId
	companyId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		index: true,
	},
  // (高醫客製用)醫院編號
	kmuh_hospital: {
		type: String,
  },
  // (高醫客製用)醫生編號
	kmuh_doctorId: {
		type: String,
  },
  // (高醫客製用)門診編號
	kmuh_deptCode: {
		type: String,
  },
  // (高醫客製用)門診時段編號
  kmuh_noonNo: {
		type: String,
	},

}, {
	'versionKey': false,
	'collection': 'ConsultingAppointment',
});

module.exports = mongoose.model('ConsultingAppointment', UnnameModel);