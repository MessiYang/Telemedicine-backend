import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	//科別顯示名字列表
	departmentNameList:[{
		code: {
			type: String,
		},
		zh_TW: {
			type: String
    },
    en_US: {
			type: String
		}
  }],
  //此科別列表的所屬醫院
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },
	// 備註
	memo: {
		type: String,
		trim: true,
		maxlength: [255, '備註已超出字數上限({MAXLENGTH})']
	},

}, {
	'versionKey': false,
	'collection': 'departmentList',
});

module.exports = mongoose.model('DepartmentList', UnnameModel);
