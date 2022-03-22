import BaseController, {async} from './base/baseController';
import MeetingBean from '../beans/meetingBean';
import {getLatestData} from '../services/vitalSignService';

class Controller extends BaseController {

	getLatest(req, res) {
		let bean = new MeetingBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getLatestData, bean),
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
	router.route('/getLatest').post(ctr.getLatest);

};
