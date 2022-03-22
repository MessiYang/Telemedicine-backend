import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

//定義掛號相關資料
let UnnameModel = new BaseModel({
  // 查詢日
	queryDay: {
		type: Date,
    //required: [true, 'queryDay為必填欄位'],
	},
	//zoom的主持人Id
	zoomUserId: {
		type: String,
  },
	// zoom meeting的原始資料
	zoomMeetingData: {
		type: Object,
  },
  topic: {
		type: String,
		trim: true,
	},
	//zoom檔案的_id
	fileId: {
		type: String,
		index: {unique: true, dropDups: true},
  },
	fileType: {
		type: String,
		trim: true,
  },
  recordingStartTime:{
    type: Date
	},
	recordingEndTime:{
    type: Date
  },
  meetingAllDuration:{
    type: Number
  },
  fileName: {
		type: String,
		trim: true,
  },
  // zoom會議檔案播放網址
  mp4PlayUrl: {
		type: String,
		trim: true,
  },
  // zoom會議檔案下載網址
  mp4DownloadUrl: {
		type: String,
		trim: true,
  },
   // zoom會議Number
	meetingNumber: {
		type: String,
		index: true,
    trim: true,
    ref: 'Appointment',
		maxlength: [64, '資料長度({VALUE})不符'],
		minlength: [1, '資料長度({VALUE})不符'],
  },
  // zoom會議UUID
	meetingUUID: {
		type: String,
		index: true,
		trim: true
	},
}, {
	'versionKey': false,
	'collection': 'MeetingRecord',
});

module.exports = mongoose.model('MeetingRecord', UnnameModel);