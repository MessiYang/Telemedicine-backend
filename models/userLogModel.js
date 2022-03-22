import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import ActionType from './type/actionType';

let UnnameModel = new BaseModel({
  // 活動種類
	action: {
		type: String,
    enum: ActionType.toValues(),
    index: true,
  },
  //使用者IP位址
  remoteAddr: {
		type: String,
  },
  loginTimeStamp: {
		type: Date,
    index: true,
	},
  // 操作員工_id
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true,
  },
  // 操作客戶_id
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
  },

  
}, {
		'versionKey': false,
		'collection': 'UserLogs',
});
module.exports = mongoose.model('UserLogs', UnnameModel);