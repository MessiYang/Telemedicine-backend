// eslint-disable-next-line no-unused-vars
import base from './base/BaseType';
import Enumeration from 'enumeration';

/**
 * 
 * Goal. maintain病患與家屬之間的關係
 * Annotator. Jack Hu
 * Date. 20211223
 * 
 * Source: http://hl7.org/fhir/valueset-relatedperson-relationshiptype.html
 * 
 */
const value = [
  {GGRPRN    : '2000',  stringValue: {'zh-TW': '祖父母',    'en-US': 'grandparent'}},   
  {PRN       : '1000',  stringValue: {'zh-TW': '父母',      'en-US': 'parent'}},
  {HUSB      : '501',   stringValue: {'zh-TW': '先生',      'en-US': 'husband'}},
  {WIFE      : '500',   stringValue: {'zh-TW': '太太',      'en-US': 'wife'}},
  {BRO       : '101',    stringValue: {'zh-TW': '兄弟',      'en-US': 'brother'}},
  {SIS       : '100',    stringValue: {'zh-TW': '姊妹',      'en-US': 'sister'}},  
  {CHILD     : '50',    stringValue: {'zh-TW': '子女',      'en-US': 'child'}},
  {GRNDCHILD : '20',    stringValue: {'zh-TW': '孫子',      'en-US': 'grandchild'}},        
  {O         : '9999',  stringValue: {'zh-TW': '其他',      'en-US': 'Other'}},   
];

module.exports = new Enumeration(value);