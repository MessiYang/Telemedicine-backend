import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
  //交易回傳是否成功編號
  code: {
		type: String,
  },
  //遠傳端交易編號
  txid: {
		type: String,
  },
  //商家訂單號碼
  partnerOrderNo: {
		type: String,
  },
  //遠傳端交易訂單成立時間
  txts: {
		type: String,
  },
  //交易金額,訂單總金額
  price: {
		type: Number,
	},
	logs: {
		type: Object,
  },
  
}, {
		'versionKey': false,
		'collection': 'UserLogs',
});
module.exports = mongoose.model('DpayDetail', UnnameModel);