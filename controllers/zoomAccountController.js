import BaseController, {async} from './base/baseController';
import zoomAccountBean from '../beans/zoomAccountBean';
import { getZoomConfig} from '../services/userService';
import {list, createZoomUser, saveZoomAccount, update} from '../services/zoomAccountService';

class Controller extends BaseController {

	list(req, res) {
		let bean = new zoomAccountBean();
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
		let bean = new zoomAccountBean();
		bean.bind(req, 'create');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getZoomConfig, bean, req.body.user),
			async.apply(createZoomUser, bean, req.body.user),
			async.apply(saveZoomAccount, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
  }
  
	update(req, res) {
		let bean = new zoomAccountBean();
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

};