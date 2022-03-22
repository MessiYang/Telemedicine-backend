import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

//定義掛號相關資料
let UnnameModel = new BaseModel({
  // 發起邀請的醫生
  launchDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true,
  },
  // 被邀請的醫生
  invitedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true,
  },
  // 被邀請的病人
  invitedPatientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
  },
  //是未接電話?
  isMissedCall: {
    type: Boolean,
    default: true
  },
  //是已讀?
  haveRead: {
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
}, {
	'versionKey': false,
	'collection': 'InviteRecord',
});

module.exports = mongoose.model('InviteRecord', UnnameModel);