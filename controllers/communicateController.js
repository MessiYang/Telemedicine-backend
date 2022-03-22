import BaseController, {async} from './base/baseController';
import CommunicateBean from '../beans/communicateBean';
import { getPatientFamilyList,getCommunicateScheduleForDoctor, getFamilyMembers, createInviteRoom,
  createReserve, removeCommunicateAppointment, removeReserve, createCommunicateAppointment, getReserveFamilyList, 
	inviteMeeting, replyReserve, checkRepeatReserve, getCommunicateSchedule} from '../services/communicateService';
import { listCompany} from '../services/companyService';
import {updateUserInMeetingStatus, profile} from '../services/userService';
//import Family from '../services/communicateService';

class Controller extends BaseController {

	getPatientFamilyList(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(getPatientFamilyList, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
  
  getCommunicateScheduleForDoctor(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(getCommunicateScheduleForDoctor, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

  createReserve(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, 'createReserve');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
    let {input} = bean;
    input.companyId = req.body.user.companyId;
		async.waterfall([
      async.apply(checkRepeatReserve, bean, req.body.user),
			async.apply(profile, bean, req.body.user),
      async.apply(listCompany, bean),
      async.apply(getFamilyMembers, bean),
      async.apply(createCommunicateAppointment, bean, req.body.user),
			async.apply(createReserve, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	removeReserve(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
      async.apply(removeCommunicateAppointment, bean),
			async.apply(removeReserve, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
  
  inviteMeeting(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
      async.apply(getReserveFamilyList, bean),
      async.apply(createInviteRoom, bean, req.body.user),
      async.apply(inviteMeeting, bean, req.body.user),
      async.apply(updateUserInMeetingStatus, bean, req.body.user, true),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

  replyReserve(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, 'replyReserve');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(replyReserve, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

  getCommunicateSchedule(req, res) {
		let bean = new CommunicateBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
    }
		async.waterfall([
			async.apply(getCommunicateSchedule, bean, req.body.user),
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
	router.route('/getPatientFamilyList').post(ctr.getPatientFamilyList);
  router.route('/getCommunicateScheduleForDoctor').post(ctr.getCommunicateScheduleForDoctor);
  router.route('/createReserve').post(ctr.createReserve);
	router.route('/removeReserve').post(ctr.removeReserve);
  router.route('/inviteMeeting').post(ctr.inviteMeeting);
  router.route('/replyReserve').post(ctr.replyReserve);
  router.route('/getCommunicateSchedule').post(ctr.getCommunicateSchedule);
};
