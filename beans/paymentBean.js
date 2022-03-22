import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			appointmentId: null,
			callbackUrl: null,
			cfgID: null,
			paymentInfo: null,
			matchCode: null,
			code: null,
			message: null,
			queryStartTime: null,
			daysRange: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			login: {
				account: this.VF('account'),
				password: this.VF('password'),
			},
			createAppLog: {
				logData: this.VF('required'),
				platform: this.VF('required'),
				appName: this.VF('required'),
				version: this.VF('required'),
			},
		}
	}
}

module.exports = UnnameBean;