let router = require('express')();
//import config from 'nconf';
import logger from '../../config/log';
import { userRoleValue } from '../../models/type/roleType';
import packageJson from '../../package.json';
//import { employee, customer } from '../../models/type/RoleType';
//import UserType from '../../models/type/UserType';
//const ADM = employee.ADM.value; ////Administrator
//const SI  = employee.SI.value; //System Integrator
//const ORG = employee.ORG.value; //Organization Manager
//const APP1 = employee.APP1.value; //Application 1 Manager
//const APP2 = employee.APP2.value; //Application 2 Manager
//const CU  = customer.CUSTOMER.value; //客戶

//const target = config.get('EXECUTE_TARGET');
//const {NODE_HOST_COMMON_ROUTES} = config.get(target);
const NODE_HOST_COMMON_ROUTES = `/v${packageJson.version}`;

const rules = {

	//account
	'/account/signUp': (~0),
	'/account/createDoctor': (~0),
	'/account/updateDoctor': (~0),
	'/account/removeDoctor': (~0),
	'/account/createPatient': (~0),
	'/account/updatePatient': (~0),
	'/account/updatePatientForApp': (~0),
	'/account/removePatient': (~0),
	'/account/checkVerifyCode': (~0),
	'/account/resendVerifyCode': (~0),
	'/account/login': (~0),
	'/account/logout': (~0),
	'/account/forgetPassword': (~0),
	'/account/resetPassword': (~0),
	'/account/updatePassword': (~0),
	'/account/auth': (~0),
	'/account/refreshToken': (~0),
	'/account/getErrorList': (~0),
	'/account/checkAppVersion': (~0),
	'/account/updateAppVersion': (~0),
	'/account/siteVerify': (~0),
	'/account/testSMS': (~0),
	'/account/apiHealth': (~0),
	'/account/getAll': (~0),

	//user
	'/user/profile': (~0),
	'/user/setApnToken': (~0),
	'/user/listEmployee': (~0),
	'/user/listCustomer': (~0),
	'/user/listCustomerToTransform': (~0),
	//'/user/listCompany': (~0),
	'/user/queryDoctor': (~0),
	'/user/getDepartmentCode': (~0),
	'/user/getRoleTypeList': (~0),
	'/user/getDepartmentList': (~0),
	'/user/setNotification': (~0),
	'/user/pushInviteMessage': (~0),
	'/user/uploadUserPhoto': (~0),
	'/user/downloadUserPhoto': (~0),
	'/user/sendMsgToMeetingMember': (~0),

	//outpatient
	'/outpatient/list': (~0),
	'/outpatient/listWeekly': (~0),
	'/outpatient/retrieve': (~0),
	'/outpatient/create': (~0),
	'/outpatient/update': (~0),
	'/outpatient/delete': (~0),
	'/outpatient/getRoom': (~0),
	'/outpatient/getRoomForShare': (~0),
	'/outpatient/getConsultingDoctorList': (~0),
	'/outpatient/getInviteRecord': (~0),			
	'/outpatient/readInviteRecord': (~0),
	'/outpatient/getStatusList': (~0),
	'/outpatient/getTimeType': (~0),
	'/outpatient/cancelCalling': (~0),
	'/outpatient/replyInvite': (~0),
	'/outpatient/end': (~0),
	
	//appointment
	'/appointment/create': (~0),
	'/appointment/hospitalSyncCreate': (~0),
	'/appointment/update': (~0),
	'/appointment/cancel': (~0),
	'/appointment/hospitalSyncCancel': (~0),
	'/appointment/get': (~0),
	'/appointment/retrieve': (~0),
	'/appointment/patientGet': (~0),
	'/appointment/getConsultingRecords': (~0),
	'/appointment/queryProgress': (~0),
	'/appointment/queryRecords': (~0),
	'/appointment/getStatusList': (~0),
	'/appointment/inviteMeeting': (~0),
	'/appointment/kickOutMeeting': (~0),
	'/appointment/updateStatus': (~0),
	'/appointment/getRecordingUrl': (~0),
	'/appointment/createConsultingAppointment': (~0),
	'/appointment/cancelConsultingAppointment': (~0),
	'/appointment/getConsultingAppointment': (~0),
	'/appointment/chome': (~0),

  //communicate
	'/communicate/getPatientFamilyList': (~0),
	'/communicate/getCommunicateScheduleForDoctor': (~0),
	'/communicate/inviteMeeting': (~0),
	'/communicate/createReserve': (~0),
	'/communicate/removeReserve': (~0),
	'/communicate/replyReserve': (~0),
	'/communicate/getCommunicateSchedule': (~0),

	//payment
	'/payment/startDpay': (~0),
	'/payment/dpayNotifyServer': (~0),
	'/payment/dpayCallback': (~0),
	'/payment/paymentJob': (~0),
 
	//vitalSign
	'/vitalSign/getLatest': (~0),

  //department
	'/department/list': (~0),
	'/department/create': (~0),
	'/department/update': (~0),
	'/department/remove': (~0),

	//zoomAccount
	'/zoomAccount/list': (~0),
	'/zoomAccount/create': (~0),
	'/zoomAccount/update': (~0),

	//company
	'/company/list': (~0),
	'/company/create': (~0),
	'/company/update': (~0),
	'/company/listServiceGroup': (~0),
	'/company/listCompanyOfServiceGroup': (~0),
	'/company/addToGroup': (~0),
	'/company/removeFromGroup': (~0),
	'/company/createServiceGroup': (~0),
	'/company/updateServiceGroup': (~0),
	'/company/deleteServiceGroup': (~0),
	'/company/getDepartmentList': (~0),

	//report
	'/report/downloadConsultingRecordsExcel': (~0),
	'/report/downloadPatientRecordsExcel': (~0),
	'/report/downloadRecordFilesZip': (~0),
	'/report/getConsultingRecordFilesZipUrl': (~0),
	'/report/getPatientRecordFilesZipUrl': (~0),
	'/report/moveRecordFilesToFTP': (~0),
	'/report/downloadRecording': (~0),

  //middleware
	'/middleware/createAppointment': (~0),
	'/middleware/cancelAppointment': (~0),

	//logs  
	'/log/getUserLogs': (~0),
	'/log/checkPassword': (~0),
	'/log/getActionType': (~0),
	'/log/createAppLog': (~0),
	'/log/getDashboardData': (~0),
	'/log/getDashboardAbnormalLog': (~0),
	'/log/notifyAllPatient': (~0),

	//meeting
	'/meeting/downloadMeetingRecordJob': (~0),
	'/meeting/createMeeting': (~0),
	'/meeting/listRecords': (~0),
	'/meeting/downloadVideo': (~0),
	'/meeting/testApns': (~0),

	// familyMember
	'/familyMember/create': (~0),
	'/familyMember/list': (~0),
	'/familyMember/update': (~0),
	// '/familyMember/remove': (~0),
	'/familyMember/getRelationshipType': (~0),
};

router.use((req, res, next) => {
	res.removeHeader("x-powered-by");
  let reqControllerPath = req.path.replace(NODE_HOST_COMMON_ROUTES, '');
	let usersession = req.body.user;
	if ([ '/account/signup',
				'/account/checkVerifyCode',
				'/account/resendVerifyCode',
				'/account/login',
				'/account/refreshToken',
				'/account/checkAppVersion',
				'/account/forgetPassword',
				'/account/resetPassword',
				'/account/apiHealth',
				'/account/siteVerify',
				'/meeting/testApns',
				'/log/createAppLog',
				'/payment/dpayNotifyServer',
				'/payment/dpayCallback',
		].includes(reqControllerPath) || rules[req.path]===(~0)) {
		return next();
	}
	if (req.method === 'POST') {
		let rule = rules[reqControllerPath];
		let roleValue = userRoleValue(usersession.role);
		if (!req.body.user.meetingSystem) req.body.user.meetingSystem = "vidyo";
		// logger.info('req.body.user: ', req.body.user);
		// logger.info('rule: ', rule);
		// logger.info('roleValue: ', roleValue);
		if (!rule) {
			logger.info(`[Auth]${req.path}=${rule}`);
		}
		if ((rule&roleValue) === 0) {
			return res.status(403).json('permission denied');
		}
	}

	return next();
});

module.exports = router;
