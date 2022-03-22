import BaseController, {async} from './base/baseController';
import AppointmentBean from '../beans/appointmentBean';
import {createConsultingAppointment,hospitalSyncCreateAppointment, updateSignupNumberForCancel, getConsultingAppointment,  inviteToJoinMeetingByVidyo,
	inviteToJoinMeetingByZoom, createAppointment, updateAppointment, requestDeleteMeeting, cancelAppointment, hospitalSyncCancelAppointment,
	getAppointmentList, retrieveAppointment, getAppointmentForPatient, getOutpatientRecords, getConsultingRecords, queryProgress, queryRecords, 
	getAppointmentStatus, requestLeaveMeeting, updateStatus, getRecordingUrl, cancelConsultingAppointment, chome} from '../services/appointmentService';
import { getZoomConfig, updateUserInMeetingStatus, checkPatientInMeeting, checkDoctorInMeeting} from '../services/userService';
import { retrieve} from '../services/outpatientService';
import { listCompany} from '../services/companyService';
import {filterNofileRecord, addVidyoAuth} from '../services/reportService';
import {createUserLogs } from '../services/logService';
import {getUser} from '../services/userService';
import {getRegScheduleByRegDate, registerRepeat, cancelRepeatRegister } from '../utils/callMWUtil';
import {inputOutpatientIdPatientId} from '../utils/stringUtil';
import ActionType from '../models/type/actionType';

class Controller extends BaseController {

	create(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'create');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	hospitalSyncCreate(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'hospitalSyncCreate');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(retrieve, bean),  //Outpatient
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				let {input} = bean;
				console.log('[hospitalSyncCreate] input: ', input);
				let patient ={
					"_id": input.patientId,
					"code": "c"
				}
				let waterfallAPI = [
					//async.apply(listCompany, bean),
					async.apply(getUser, bean, patient),  //Customer
					async.apply(getRegScheduleByRegDate, req, bean),
					//async.apply(registerFirst, req, bean),
					async.apply(registerRepeat, req, bean),
					async.apply(hospitalSyncCreateAppointment, bean),
				]
				if(input.outpatientData.doctorId&&input.outpatientData.doctorId.companyId&&input.outpatientData.doctorId.companyId.isSyncAppointment==false){
					waterfallAPI = [
						async.apply(createAppointment, bean),
					]
				}
				async.waterfall(
					waterfallAPI
				, (err) => {
					if (err) {
						return res.json(super.fail(err));
					} else {
						return res.json(super.success(bean.output.result));
					}
				});
			}
		});
	}

	update(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'update');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
  }
	
	cancel(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'cancel');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(cancelAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	
	hospitalSyncCancel(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'hospitalSyncCancel');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(retrieveAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				let {input} = bean;
				//console.log('[hospitalSyncCancel] input.appointmentData.outpatientId: ', input.appointmentData.outpatientId);
				let waterfallAPI = [
					async.apply(inputOutpatientIdPatientId, bean),
					async.apply(retrieve, bean),  //Outpatient
					async.apply(getUser, bean, null),  //Customer
					async.apply(getRegScheduleByRegDate, req, bean),
					async.apply(cancelRepeatRegister, req, bean),
					async.apply(hospitalSyncCancelAppointment, bean),
					async.apply(updateSignupNumberForCancel, bean),
				]
				if(input.appointmentData.outpatientId&&input.appointmentData.outpatientId.doctorId&&input.appointmentData.outpatientId.doctorId.companyId
					&&input.appointmentData.outpatientId.doctorId.companyId.isSyncAppointment==false){
					waterfallAPI = [
						async.apply(cancelAppointment, bean),
						async.apply(updateSignupNumberForCancel, bean),
					]
				}
				async.waterfall(
					waterfallAPI
				, (err) => {
					if (err) {
						return res.json(super.fail(err));
					} else {
						return res.json(super.success(bean.output.result));
					}
				});
			}
		});
	}

  get(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getAppointmentList, bean),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	retrieve(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(retrieveAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	patientGet(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getAppointmentForPatient, bean, req.body.user),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getConsultingRecords(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'getConsultingRecords');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		if(req._remoteAddress) input.remoteAddr = req._remoteAddress;
		async.waterfall([
			async.apply(getConsultingRecords, bean, req.body.user),
			async.apply(getOutpatientRecords, bean, req.body.user),
			async.apply(filterNofileRecord, bean),
			async.apply(addVidyoAuth, bean),
			async.apply(createUserLogs, bean, req.body.user, ActionType.GET_MR.value),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	queryProgress(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(queryProgress, bean),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	queryRecords(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(queryRecords, bean, req.body.user),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getStatusList(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getAppointmentStatus, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	inviteMeeting(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'inviteOutMeeting');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		// let inviteMeetingFunc = inviteToJoinMeetingByZoom;
		// if (defaultConf.USE_VIDYO){  
		// 	inviteMeetingFunc = inviteToJoinMeetingByVidyo;
		// }
		let inviteMeetingFunc = inviteToJoinMeetingByVidyo;
		if(req.body.user.meetingSystem == "zoom"){
			inviteMeetingFunc = inviteToJoinMeetingByZoom;
		}
		async.waterfall([
			//async.apply(checkMeetingRoomsLimit, req.body.user.companyId),
			async.apply(checkPatientInMeeting, bean),
			async.apply(checkDoctorInMeeting, bean),
			async.apply(getZoomConfig, bean, req.body.user),
			async.apply(inviteMeetingFunc, bean, req.body.user),
			//async.apply(pushInviteOnlineMessage, bean, req.body.user),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, true),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	kickOutMeeting(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'kickOutMeeting');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getZoomConfig, bean, req.body.user),
			async.apply(updateStatus, bean),
			async.apply(retrieveAppointment, bean),
			async.apply(requestLeaveMeeting, bean, req.body.user),
			async.apply(requestDeleteMeeting, bean, req.body.user),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	updateStatus(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'updateStatus');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateStatus, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getRecordingUrl(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'getRecordingUrl');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getRecordingUrl, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	createConsultingAppointment(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'createConsultingAppointment');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCompany, bean),
			async.apply(createConsultingAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	cancelConsultingAppointment(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'cancelConsultingAppointment');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCompany, bean),
			async.apply(cancelConsultingAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getConsultingAppointment(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, 'getConsultingAppointment');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getConsultingAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	chome(req, res) {
		let bean = new AppointmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(chome, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
}

module.exports.path = function(router) {
	let ctr = new Controller();
	router.route('/create').post(ctr.create);
	router.route('/hospitalSyncCreate').post(ctr.hospitalSyncCreate);
	router.route('/update').post(ctr.update);	
	router.route('/cancel').post(ctr.cancel);	
	router.route('/hospitalSyncCancel').post(ctr.hospitalSyncCancel);
	router.route('/get').post(ctr.get);
	router.route('/retrieve').post(ctr.retrieve);
	router.route('/patientGet').post(ctr.patientGet);
	router.route('/getConsultingRecords').post(ctr.getConsultingRecords);
	router.route('/queryProgress').post(ctr.queryProgress);
	router.route('/queryRecords').post(ctr.queryRecords);
	router.route('/getStatusList').post(ctr.getStatusList);
	router.route('/inviteMeeting').post(ctr.inviteMeeting);
	router.route('/kickOutMeeting').post(ctr.kickOutMeeting);
	router.route('/updateStatus').post(ctr.updateStatus);
	router.route('/getRecordingUrl').post(ctr.getRecordingUrl);
	router.route('/createConsultingAppointment').post(ctr.createConsultingAppointment);
	router.route('/cancelConsultingAppointment').post(ctr.cancelConsultingAppointment);
	router.route('/getConsultingAppointment').post(ctr.getConsultingAppointment);
	router.route('/chome').post(ctr.chome);
};
