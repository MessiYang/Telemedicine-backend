import path from 'path';
import xss from 'xss';
import querystring from 'querystring';
import BaseController, { async} from './base/baseController';
import UserBean from '../beans/userBean';
import {inviteToJoinMeetingByVidyo, retrieveAppointment} from '../services/appointmentService';
import {profile, setApnToken, listEmployee, listCustomer, listCustomerToTransform, queryDoctor, getDepartmentCode, getRoleTypeList, getDepartmentList, setNotification, pushInviteOnlineMessage, uploadUserPhoto, sendMsgToMeetingMember, checkVidyoData, updateUserInMeetingStatus} from '../services/userService';

class Controller extends BaseController {
	profile(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		console.log('user:', req.body.user)
		async.waterfall([
			async.apply(profile, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output));
			}
		});
	}

	setApnToken(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		console.log('user:', req.body.user)
		async.waterfall([
			async.apply(setApnToken, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	listEmployee(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listEmployee, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	listCustomer(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCustomer, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	listCustomerToTransform(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCustomerToTransform, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	// listCompany(req, res) {
	// 	let bean = new UserBean();
	// 	bean.bind(req, null);
	// 	if (bean.hasError()) {
	// 		return res.json(super.fail(bean.errors));
	// 	}
	// 	async.waterfall([
	// 		async.apply(listCompany, bean),
	// 	], (err) => {
	// 		if (err) {
	// 			return res.json(super.fail(err));
	// 		} else {
	// 			return res.json(super.success(bean.output.result));
	// 		}
	// 	});
	// }

	queryDoctor(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(queryDoctor, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	getDepartmentCode(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getDepartmentCode, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	getRoleTypeList(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getRoleTypeList, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	getDepartmentList(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getDepartmentList, bean,  req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	setNotification(req, res) {
		let bean = new UserBean();
		bean.bind(req, 'setNotification');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(setNotification, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	pushInviteMessage(req, res) {
		let bean = new UserBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		let APIArray = [			
			async.apply(pushInviteOnlineMessage, bean, req.body.user)
		];
		if(input.appointmentId){
			input.isPushInviteMsg = true;
			APIArray = [	
				async.apply(retrieveAppointment, bean),		
				async.apply(inviteToJoinMeetingByVidyo, bean, req.body.user),
				async.apply(pushInviteOnlineMessage, bean, req.body.user),
				async.apply(updateUserInMeetingStatus, bean, req.body.user, true)
			]
		}
		async.waterfall(
			APIArray
		, (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	uploadUserPhoto(req, res) {
		async.waterfall([
			async.apply(uploadUserPhoto, req),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}
	
	downloadUserPhoto(req, res) {
		const filename = querystring.escape(xss(req.query.filename));
		if (filename) {
			//console.log('[login] setTokenInCookie/start!!  req.body:',req.body.token);
			//console.log('[login] setTokenInCookie/2222  req.body:', req.body.token);
			//console.log("filename: ", filename);
			let filePath = path.join(__dirname, `../public/images/${xss(filename)}`);
			res.download(filePath, (err) => {
				if (err) {
					console.log("[downloadUserPhoto]err: ", err);
					res.status(401).send('invalid file name');
				}
			});
		} else {
			res.status(401).send('invalid file name');
		}
	}

	sendMsgToMeetingMember(req, res) {
		let bean = new UserBean();
		bean.bind(req, 'sendMsgToMeetingMember');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		input.targetRole = '';
		if (input.isToShareRole) input.targetRole = 'share';
		// if (!req.body.user.currentVidyoPin || req.body.user.currentVidyoPin=='0') return res.json(super.fail({name: 'NoLiveMeeting'}));
		// if (req.body.user.currentVidyoPin) input.vidyoPin = req.body.user.currentVidyoPin;
		// if (req.body.user.currentVidyoRoomUrl) input.vidyoRoomUrl = req.body.user.currentVidyoRoomUrl;
		async.waterfall([
			async.apply(profile, bean, req.body.user),
			async.apply(checkVidyoData, bean),
			async.apply(listEmployee, bean, req.body.user),
			async.apply(sendMsgToMeetingMember, bean),
		], (err) => {

			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}
}

module.exports.path = function(router) {
	let ctr = new Controller();listEmployee
	router.route('/profile').post(ctr.profile);
	router.route('/setApnToken').post(ctr.setApnToken);
	router.route('/listEmployee').post(ctr.listEmployee);
	router.route('/listCustomer').post(ctr.listCustomer);
	router.route('/listCustomerToTransform').post(ctr.listCustomerToTransform);
	//router.route('/listCompany').post(ctr.listCompany);
	router.route('/queryDoctor').post(ctr.queryDoctor);
	router.route('/getDepartmentCode').post(ctr.getDepartmentCode);
	router.route('/getRoleTypeList').post(ctr.getRoleTypeList);
	router.route('/getDepartmentList').post(ctr.getDepartmentList);
	router.route('/setNotification').post(ctr.setNotification);
	router.route('/pushInviteMessage').post(ctr.pushInviteMessage);
	router.route('/uploadUserPhoto').post(ctr.uploadUserPhoto);
	router.route('/downloadUserPhoto').get(ctr.downloadUserPhoto);
	router.route('/sendMsgToMeetingMember').post(ctr.sendMsgToMeetingMember);
};
