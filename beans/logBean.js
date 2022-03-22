import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			logData: null,
			platform: null,
			appName: null,
			version: null,
			titleMsg: null,
			notifyMsg: null,
			notifyTarget: null,
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