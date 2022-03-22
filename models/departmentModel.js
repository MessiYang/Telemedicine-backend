import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
  name: {
		type: String,
		index: true,
	},
	code: {
		type: String,
		index: true,
  },
  // 所屬company _id
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },
}, {
	'versionKey': false,
	'collection': 'Department',
});

module.exports = mongoose.model('Department', UnnameModel);