import BaseController, { async} from './base/baseController';
import MiddlewareBean from '../beans/middlewareBean';
import { checkQueryStartTime, checkOutpatientIdAndPatientId, checkAppointmentId, checkWaitNoAndSuggestTime } from '../services/middlewareService';
//import { listCompany} from '../services/companyService';
import { listCustomer} from '../services/userService';
import { getOutpatientByRoom} from '../services/outpatientService';
import {hospitalSyncCreateAppointment, cancelAppointment, getAppointmentList, checkRepeatAppointment} from '../services/appointmentService';
class Controller extends BaseController {
	createAppointment(req, res) {
		let bean = new MiddlewareBean();
		bean.bind(req, 'createAppointment');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCustomer, bean, req.body.user),
			async.apply(checkQueryStartTime, bean),
      async.apply(getOutpatientByRoom, bean),
			async.apply(checkOutpatientIdAndPatientId, bean),
			async.apply(checkRepeatAppointment, bean),
			async.apply(checkWaitNoAndSuggestTime, bean),
			async.apply(hospitalSyncCreateAppointment, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	cancelAppointment(req, res) {
		let bean = new MiddlewareBean();
		bean.bind(req, 'cancelAppointment');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listCustomer, bean, req.body.user),		
			async.apply(checkQueryStartTime, bean),
      async.apply(getOutpatientByRoom, bean),
			async.apply(checkOutpatientIdAndPatientId, bean),
      async.apply(getAppointmentList, bean),
			async.apply(checkAppointmentId, bean),
			async.apply(cancelAppointment, bean),
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
	let ctr = new Controller();
	router.route('/createAppointment').post(ctr.createAppointment);
	router.route('/cancelAppointment').post(ctr.cancelAppointment);

}; 