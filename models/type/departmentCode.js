// eslint-disable-next-line no-unused-vars
import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
  {MEDICAL         : 'M'     , stringValue: {'zh-TW': '內科', 'en-US': 'Medical'}},  
  {SURGERY         : 'S'     , stringValue: {'zh-TW': '外科'  , 'en-US': 'Surgery'}},
  {G_SURGERY       : 'GS'    , stringValue: {'zh-TW': '一般外科'  , 'en-US': 'General Surgery'}},
  {ORTHOPEDICS     : 'ORTHO' , stringValue: {'zh-TW': '骨科'    , 'en-US': 'Orthopedics'}},     
  {EARS_NOSE_THROAT: 'ENT'   , stringValue: {'zh-TW': '耳鼻喉科'  , 'en-US': 'Ears, Nose, and Throat'}}, 
  {OPTHALMOLOGY    : 'OPH'   , stringValue: {'zh-TW': '眼科'    , 'en-US': 'Ophthalmology'}},  
  {DERMATOLOGY     : 'DER'   , stringValue: {'zh-TW': '皮膚科'    , 'en-US': 'Dermatology'}}, 
];
module.exports = new Enumeration(value);