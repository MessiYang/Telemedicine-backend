import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	// 預約會議主題:  溝通會議= communicate
	topic: {
		type: String,
		index: true,
		required: [true, '會議主題為必填欄位'],
	},
  // 溝通會議掛號_id
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true,
  },
  // 醫師_id
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true,
  },
  // 病患_id
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
  },
  //家屬_id
  familymemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
    required: [true, '會議參與人為必填欄位'],
  },
  //此customer是否已回覆會議通知?
  haveReplyReserve: {
    type: Boolean,
    default: false,
  },
  //此customer是否接受撥打此會議?
  isReceiveCalling: {
    type: Boolean,
    default: false,
  },
  // //排定的會議時間
	// meetingStartTime: {
	// 	type: Date,
  //   required: [true, '會議時間為必填欄位'],
	// },
 
}, {
  'versionKey': false,
  'collection': 'Reserve',
});

module.exports = mongoose.model('Reserve', UnnameModel);