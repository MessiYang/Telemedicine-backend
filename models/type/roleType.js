//import base from './base/BaseType';
import Enumeration from 'enumeration';

const evalue = [
	{ADM:     1<<12, stringValue: {'zh-TW': '系統管理員', 'en-US': 'System Administrator'}}, //Administrator role=4096
	{SI:      1<<10, stringValue: {'zh-TW': '集團管理員', 'en-US': 'Group Administrator'}}, //System Integrator(集團) role=1024
	{MANAGER: 1<< 8, stringValue: {'zh-TW': '組織管理員', 'en-US': 'Organization Administrator'}}, //Organization Manager(醫院管理員) 256
	{DOCTOR:  1<< 7, stringValue: {'zh-TW': '醫師', 'en-US': 'doctor'}}, //Application 1 Manager(醫師) 128
	{NURSE:   1<< 6, stringValue: {'zh-TW': '護理師', 'en-US': 'nurse'}}, //Application 2 Manager(護理師) 64
];

const cvalue = [
	{PATIENT:  1<< 4, stringValue: {'zh-TW': '病患', 'en-US': 'patient'}}, //客s戶(病患)  16
	{FAMILY:   1<< 3, stringValue: {'zh-TW': '家屬', 'en-US': 'family'}}, //客戶(家屬)  8
];

module.exports.employee = new Enumeration(evalue);
module.exports.customer = new Enumeration(cvalue);

function userRoleValue(userrole) {
	let role = [];
	role = userrole || [];
	let roleValue = 0;
	if (typeof role == 'number') {
		roleValue = role;
	} else if (role.length > 0) {
		roleValue = role.reduce((prev, element)=>{
			return prev | element;
		});
	}
	return roleValue;
}

module.exports.userRoleValue = userRoleValue;
module.exports.isRole = function(role, userrole) {
	let roleValue = userRoleValue(userrole);
	return ((role&roleValue) !== 0);
}