import BaseController, { async} from './base/baseController';
import AccountBean from '../beans/accountBean';
import RoleType from '../models/type/roleType';
import ActionType from '../models/type/actionType';
import {checkMeetingSystem} from '../services/meetingService';
import {getUser, checkUserPersonalId, checkUserUpdatePersonalId, validUser, checkUserRepeatLogin, createPatient, updatePatient, updatePatientForApp, removePatient, createUser, 
	createDoctor, updateDoctor, removeDoctor, setVoipToken, setApnToken, setFcmToken, removeApnToken} from '../services/userService';
import {regenVerifyCode, checkRepeatSignUp, create, checkVerifyCode, resendVerifyCode, checkAccount, updateVerifyCode, resetPassword,
	KEY_TOKEN, loginOutputData, authenticate, regenToken, sendVerifyCode, updatePassword,
	regenRefreshToken, setTokenInCookie, verifyRefreshToken, getErrorList, checkAppVersion, updateAppVersion, 
	checkXmppUserValid, siteVerify, apiHealth, getAll, boomtest} from '../services/accountService';
import {createUserLogs } from '../services/logService';
import {updateAUser } from '../utils/xmppUtil';

class Controller extends BaseController {

  signUp(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'signUp');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		if(input.role <= RoleType.customer.PATIENT.value) {
			if(!input.mobile||!input.birthday||!input.personalId) return res.json(super.fail({name:'ParamMalformedError'}));
			input.account = input.mobile;
			input.code ='c';
			input.userType ='c';
			input.valid = false; 
			async.waterfall([
				async.apply(regenVerifyCode, bean),
				async.apply(checkRepeatSignUp, bean),
				async.apply(checkUserPersonalId, bean),
				async.apply(create, bean),
				async.apply(createUser, bean),
				async.apply(sendVerifyCode, bean),
			], (err) => {
				if (err) {
					return res.json(super.fail(err));
				} else {
					return res.json(super.success(bean.output.result));
				}
			});
		}else{
			if(!input.account) return res.json(super.fail({name:'ParamMalformedError'}));
			input.code ='e';
			input.userType ='e';
			input.valid = true; 
			async.waterfall([
				//async.apply(regenVerifyCode, bean),
				async.apply(checkRepeatSignUp, bean),
				async.apply(create, bean),
				async.apply(createUser, bean),
				//async.apply(sendVerifyCode, bean),
			], (err) => {
				if (err) {
					return res.json(super.fail(err));
				} else {
					return res.json(super.success(bean.output.result));
				}
			});
		}
	}

	createDoctor(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'createDoctor');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		input.userType ='e';
		input.valid = true; 
		async.waterfall([
			async.apply(checkRepeatSignUp, bean),
			async.apply(create, bean),
			async.apply(createDoctor, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	updateDoctor(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateDoctor, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	removeDoctor(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(removeDoctor, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	createPatient(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'createPatient');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		input.code ='c';
		input.userType ='c';
		input.valid = true; 
		input.account = input.mobile;
		async.waterfall([
			async.apply(checkRepeatSignUp, bean),
			async.apply(checkUserPersonalId, bean),
			async.apply(create, bean),
			async.apply(createPatient, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	updatePatient(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'updatePatient');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		input.code ='c';
		async.waterfall([
			async.apply(checkUserUpdatePersonalId, bean, input.patientId),
			async.apply(updatePatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	updatePatientForApp(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'updatePatientForApp');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		input.code ='c';
		async.waterfall([
			async.apply(checkUserUpdatePersonalId, bean, req.body.user._id),
			async.apply(updatePatientForApp, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	removePatient(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'removePatient');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(removePatient, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	checkVerifyCode(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'checkVerifyCode');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(checkVerifyCode, bean),
			async.apply(validUser, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	resendVerifyCode(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'resendVerifyCode');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(resendVerifyCode, bean),
			async.apply(sendVerifyCode, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	login(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'login');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(authenticate, bean),
			async.apply(checkMeetingSystem, bean, req),
			async.apply(regenToken, bean, req),
			async.apply(regenRefreshToken, bean, req),
			async.apply(setTokenInCookie, bean, req, res),
			async.apply(checkUserRepeatLogin, bean),
			async.apply(setVoipToken, bean),
			async.apply(setApnToken, bean),
			async.apply(setFcmToken, bean),
			async.apply(checkXmppUserValid, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				let {input} = bean;
				createUserLogs(bean, input.accountdata.user, ActionType.LOGIN.value, ()=>{});
				return res.json(super.success(loginOutputData(req)));
			}
		});
	}

	logout(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(removeApnToken, bean, req.body.user),
			async.apply(createUserLogs, bean, req.body.user, ActionType.LOGOUT.value),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				if(req.session){
					delete req.session.user;
					delete req.session.cases;
					delete req.session.company;
				}
				res.clearCookie(KEY_TOKEN);
				return res.json(super.success());
			}
		});
	}

	forgetPassword(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'forgetPassword');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(checkAccount, bean),
			async.apply(regenVerifyCode, bean),
			async.apply(updateVerifyCode, bean),
			async.apply(sendVerifyCode, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	resetPassword(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'resetPassword');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(resetPassword, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	updatePassword(req, res) {
		let bean = new AccountBean();
		bean.bind(req, 'updatePassword');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getUser, bean, req.body.user),
			async.apply(updatePassword, bean),	
			async.apply(createUserLogs, bean, req.body.user, ActionType.CHANGE_PW.value),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	auth(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(setTokenInCookie, bean, req, res),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(loginOutputData(req)));
				//return res.json(super.success());
			}
		});
	}

	refreshToken(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(verifyRefreshToken, bean, req, res),
			async.apply(authenticate, bean),
			async.apply(regenToken, bean, req),
			async.apply(setTokenInCookie, bean, req, res),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(loginOutputData(req)));
			}
		});
	}

	getErrorList(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getErrorList, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	checkAppVersion(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			//async.apply(boomtest, bean),
			async.apply(checkAppVersion, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	
	updateAppVersion(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(boomtest, bean),
			//async.apply(updateAUser, bean),
			//async.apply(updateAppVersion, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	siteVerify(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(siteVerify, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	testSMS(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(sendVerifyCode, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	apiHealth(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(apiHealth, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getAll(req, res) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getAll, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

}
let base = new Controller();
module.exports = {
  login: base.login,
  refreshToken: base.refreshToken
};

module.exports.path = function(router) {
	let ctr = new Controller();
	router.route('/signUp').post(ctr.signUp);
	router.route('/createDoctor').post(ctr.createDoctor);	
	router.route('/updateDoctor').post(ctr.updateDoctor);	
	router.route('/removeDoctor').post(ctr.removeDoctor);	
	router.route('/createPatient').post(ctr.createPatient);	
	router.route('/updatePatient').post(ctr.updatePatient);	
	router.route('/updatePatientForApp').post(ctr.updatePatientForApp);	
	router.route('/removePatient').post(ctr.removePatient);	
	router.route('/checkVerifyCode').post(ctr.checkVerifyCode);
	router.route('/resendVerifyCode').post(ctr.resendVerifyCode);
	router.route('/login').post(ctr.login);
	router.route('/logout').post(ctr.logout);
	router.route('/forgetPassword').post(ctr.forgetPassword);
	router.route('/resetPassword').post(ctr.resetPassword);
	router.route('/updatePassword').post(ctr.updatePassword);
	router.route('/auth').post(ctr.auth);
	router.route('/refreshToken').post(ctr.refreshToken);
	router.route('/getErrorList').post(ctr.getErrorList);
	router.route('/checkAppVersion').post(ctr.checkAppVersion);
	router.route('/updateAppVersion').post(ctr.updateAppVersion);
	router.route('/siteVerify').post(ctr.siteVerify);
	router.route('/testSMS').post(ctr.testSMS);
	router.route('/apiHealth').post(ctr.apiHealth);
	// router.route('/getAll').post(ctr.getAll);
};
