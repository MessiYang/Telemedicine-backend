import BaseController, { async} from './base/baseController';
import DepartmentBean from '../beans/departmentBean';
import { list, create, update, remove} from '../services/departmentService';

class Controller extends BaseController {
	list(req, res) {
		let bean = new DepartmentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(list, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	create(req, res) {
		let bean = new DepartmentBean();
		bean.bind(req, 'create');
		console.log('create',  req.body.user);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(create, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	update(req, res) {
		let bean = new DepartmentBean();
		bean.bind(req, 'update');
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

	remove(req, res) {
		let bean = new DepartmentBean();
		bean.bind(req, 'update');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(remove, bean),
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
	router.route('/remove').post(ctr.remove);
};
