import BaseController, { async} from './base/baseController';
import CompanyBean from '../beans/companyBean';
import { listCompany, create, getZoomAccountUsedStatus, update, listServiceGroup, listCompanyOfServiceGroup, getGroupOfEmployee, createServiceGroup, updateServiceGroup, deleteServiceGroup,
	getDepartmentList, addToGroup, removeFromGroup} from '../services/companyService';

class Controller extends BaseController {
	list(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCompany, bean),
			async.apply(getZoomAccountUsedStatus, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	create(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, 'create');
		console.log('create',  req.body.user);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(create, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	update(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, 'update');
		console.log('update',  req.body.user);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(update, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	listServiceGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listServiceGroup, bean),
			async.apply(getGroupOfEmployee, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	
	listCompanyOfServiceGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCompanyOfServiceGroup, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	addToGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(addToGroup, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	
	removeFromGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(removeFromGroup, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	createServiceGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, 'createServiceGroup');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createServiceGroup, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	updateServiceGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, 'updateServiceGroup');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateServiceGroup, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	deleteServiceGroup(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, 'updateServiceGroup');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(deleteServiceGroup, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	getDepartmentList(req, res) {
		let bean = new CompanyBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		console.log('getDepartmentList',  req.body.user);
		async.waterfall([
			async.apply(getDepartmentList, bean, req.body.user),
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
	router.route('/create').post(ctr.create);
	router.route('/update').post(ctr.update);
	router.route('/listServiceGroup').post(ctr.listServiceGroup);
	router.route('/listCompanyOfServiceGroup').post(ctr.listCompanyOfServiceGroup);
	router.route('/addToGroup').post(ctr.addToGroup);
	router.route('/removeFromGroup').post(ctr.removeFromGroup);
	router.route('/createServiceGroup').post(ctr.createServiceGroup);
	router.route('/updateServiceGroup').post(ctr.updateServiceGroup);
	router.route('/deleteServiceGroup').post(ctr.deleteServiceGroup);
	router.route('/getDepartmentList').post(ctr.getDepartmentList);
};
