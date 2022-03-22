import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
  // companyId
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },
  //app平台 "iOS"
  platform: {
    type: String,
    trim: true,
  },
  //app 醫生APP:"doctorAPP" , 病人APP:"patientAPP""
  appName:{
    type: String,
    trim: true,
  },
  //app 版本更新
  version: {
    type: String,
    trim: true,
  },
  bulidNumber: {
    type: String,
    trim: true,
  },
  //更新規則  "1":建議更新, "2":強制更新
  updateLevel: {
    type: String,
    trim: true,
  },
}, {
	'versionKey': false,
	'collection': 'AppUpdate',
});

module.exports = mongoose.model('AppUpdate', UnnameModel);
