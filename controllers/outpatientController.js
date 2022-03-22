import BaseController, {async} from './base/baseController';
import OutpatientBean from '../beans/outpatientBean';
import OutPatientType from '../models/type/outpatientType';
//import socketIOUtil from '../utils/socketIOUtil';
import {addUserLoginStatus} from '../services/logService';
import {endAllAppointments} from '../services/appointmentService';
import { requestLeaveMeeting, requestDeleteMeeting, updateStatus} from '../services/appointmentService';
import { getZoomConfig, initialLiveMeeting, updateUserInMeetingStatus} from '../services/userService';
import {listOutpatient, listWeeklyOutpatient, retrieve, checkTheSameOptTime, createOutpatient, updateOutpatient, deleteOutpatient, getReadyOutpatient, 
	getLiveRoomForShare, getOutPatientStatus, startOutpatient, updateOutpatientStatus, getConsultingDoctorList, getTimeType,
	getInviteRecord, readInviteRecord, replyInvite, startVidyoRecording, cancelCalling, getKMUHConsultingList} from '../services/outpatientService';

class Controller extends BaseController {

	list(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(listOutpatient, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	listWeekly(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(listWeeklyOutpatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	retrieve(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(retrieve, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	create(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(checkTheSameOptTime, bean),
			async.apply(createOutpatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	update(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, 'update');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateOutpatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	delete(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, 'delete');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(deleteOutpatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
  }

  getRoom(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
    //console.log('~~~~req.token: ', req.body);
		async.waterfall([
			async.apply(getZoomConfig, bean, req.body.user),
			//async.apply(initialLiveMeeting, bean),
			async.apply(getReadyOutpatient, bean, req.body.user),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
			//async.apply(socketIOUtil.onlineHeartBeat, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getRoomForShare(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
    console.log('~~~~req.token: ', req.body);
		async.waterfall([
			async.apply(getZoomConfig, bean, req.body.user),
			async.apply(getLiveRoomForShare, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getConsultingDoctorList(req, res) {
		//console.log('~~~~req.token.user: ', req.body.user);
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
    //console.log('~~~~req.token: ', req.body.token);
		async.waterfall([
			//async.apply(getServiceGroupOfCompanyIds, bean, req.body.user),
			async.apply(getConsultingDoctorList, bean, req.body.user),
			async.apply(addUserLoginStatus, bean),
			//async.apply(getKMUHConsultingList, bean, req.body.token),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getInviteRecord(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
    //console.log('~~~~req.token: ', req.body);
		async.waterfall([
			async.apply(getInviteRecord, bean, req.body.user),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	
	readInviteRecord(req, res) {
		console.log('~~~~req.token.user: ', req.body.user);
		let bean = new OutpatientBean();
		bean.bind(req, 'readInviteRecord');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
    //console.log('~~~~req.token: ', req.body);
		async.waterfall([
			async.apply(readInviteRecord, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getStatusList(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getOutPatientStatus, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	getTimeType(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getTimeType, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	cancelCalling(req, res) {
		console.log('~~~~req.token.user: ', req.body.user);
		let bean = new OutpatientBean();
		bean.bind(req, 'cancelCalling');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getZoomConfig, bean, req.body.user),
			async.apply(updateStatus, bean),
			async.apply(cancelCalling, bean, req.body.user),
			//async.apply(requestLeaveMeeting, bean),
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

	replyInvite(req, res) {
		console.log('~~~~req.token.user: ', req.body.user);
		let bean = new OutpatientBean();
		bean.bind(req, 'replyInvite');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		let isInMeeting = false;
		if(input.isAccept == true) isInMeeting = true;
    console.log('isInMeeting: ', isInMeeting);
		async.waterfall([
			async.apply(replyInvite, bean, req.body.user),
			async.apply(startVidyoRecording, bean),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, isInMeeting),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

  start(req, res) {
		let bean = new OutpatientBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(startOutpatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	} 
	
	end(req, res) {
		let bean = new OutpatientBean();
		req.body.status = OutPatientType.END.value;
		//console.log('req.body: ', req.body);
		bean.bind(req, 'end');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getZoomConfig, bean, req.body.user),
			//async.apply(initialLiveMeeting, bean),
			async.apply(endAllAppointments, bean),
			async.apply(updateOutpatientStatus, bean),
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
	router.route('/list').post(ctr.list);
	router.route('/listWeekly').post(ctr.listWeekly);
	router.route('/retrieve').post(ctr.retrieve);
	router.route('/create').post(ctr.create);
	router.route('/update').post(ctr.update);
	router.route('/delete').post(ctr.delete);
	router.route('/getRoom').post(ctr.getRoom);
	router.route('/getRoomForShare').post(ctr.getRoomForShare);
	router.route('/getConsultingDoctorList').post(ctr.getConsultingDoctorList);
	router.route('/getInviteRecord').post(ctr.getInviteRecord);
	router.route('/readInviteRecord').post(ctr.readInviteRecord);
	router.route('/getStatusList').post(ctr.getStatusList);
	router.route('/getTimeType').post(ctr.getTimeType);
	router.route('/cancelCalling').post(ctr.cancelCalling);
	router.route('/replyInvite').post(ctr.replyInvite);
	router.route('/start').post(ctr.start);
	router.route('/end').post(ctr.end);
};
