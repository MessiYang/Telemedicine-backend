import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
  // 查詢日
	queryDay: {
		type: Date,
    //required: [true, 'queryDay為必填欄位'],
	},
	// 密碼
	logs: {
		type: Object,
  },
  
}, {
		'versionKey': false,
		'collection': 'ZoomLogs',
});
module.exports = mongoose.model('ZoomLogs', UnnameModel);