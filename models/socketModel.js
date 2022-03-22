import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
	},
	socketId: {
		type: String,
		index: true,
		default: '0',
	},
	deviceId: {
		type: String,
		index: true,
		default: '0',
  },
}, {
	'versionKey': false,
	'collection': 'Socket',
});

module.exports = mongoose.model('Socket', UnnameModel);
