import BaseController, { async} from './base/baseController';
import LogBean from '../beans/logBean';
import { getUserLogs, createUserLogs, updateUserAppVersion, checkPassword, getActionType, createAppLog, getDashboardData, getDashboardAbnormalLog, notifyAllPatient} from '../services/logService';

class Controller extends BaseController {
	getUserLogs(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getUserLogs, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	createUserLogs(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		console.log('create',  req.body.user);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createUserLogs, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	checkPassword(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(checkPassword, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getActionType(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getActionType, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	createAppLog(req, res) {
		let bean = new LogBean();
		bean.bind(req, 'createAppLog');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createAppLog, bean),
			async.apply(updateUserAppVersion, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	getDashboardData(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getDashboardData, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getDashboardAbnormalLog(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getDashboardAbnormalLog, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	notifyAllPatient(req, res) {
		let bean = new LogBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(notifyAllPatient, bean),
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
	router.route('/getUserLogs').post(ctr.getUserLogs);
	router.route('/createUserLogs').post(ctr.createUserLogs);
	router.route('/checkPassword').post(ctr.checkPassword);
	router.route('/getActionType').post(ctr.getActionType);
	router.route('/createAppLog').post(ctr.createAppLog);
	router.route('/getDashboardData').post(ctr.getDashboardData);
	router.route('/getDashboardAbnormalLog').post(ctr.getDashboardAbnormalLog);

	router.route('/notifyAllPatient').post(ctr.notifyAllPatient);
}; 