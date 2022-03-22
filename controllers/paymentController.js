import BaseController, { async} from './base/baseController';
import logger from '../config/log';
import config from 'nconf';
import PaymentBean from '../beans/paymentBean';
import { dpayNotifyUpdateCardData, getPaymentUrl, updateDpayData, callbackFrontend, checkAppointmentPriceAndCard, mapPaymentList} from '../services/paymentService';
//import {requestOAuthToken} from '../utils/dpayUtil';

const target = config.get('EXECUTE_TARGET');
const {DPAY_FRONTEND_CALLBACK_URL} = config.get(target);

class Controller extends BaseController {
	startDpay(req, res) {
		let bean = new PaymentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
      //async.apply(requestOAuthToken, bean),
			async.apply(getPaymentUrl, bean),
      async.apply(updateDpayData, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	dpayNotifyServer(req, res) {
		let bean = new PaymentBean();
		logger.info('[dpayNotifyServer] req.body: ', req.body);
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(dpayNotifyUpdateCardData, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success());
			}
		});
	}

	dpayCallback(req, res) {
		let bean = new PaymentBean();
		logger.info('[dpayCallback] req.body: ', req.body);
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(callbackFrontend, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.redirect(bean.output.url);
			}
		});
	}

	paymentJob(req, res) {
		let bean = new PaymentBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(checkAppointmentPriceAndCard, bean),
			async.apply(mapPaymentList, bean),
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
	router.route('/startDpay').post(ctr.startDpay);
	router.route('/dpayNotifyServer').post(ctr.dpayNotifyServer);
	router.route('/dpayCallback').post(ctr.dpayCallback);
	router.route('/paymentJob').post(ctr.paymentJob);
};