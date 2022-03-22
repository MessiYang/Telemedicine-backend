import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			downloadDay: null,
			isDebug: null,
			tokens: null,
			alert: null,
			payload: null,
			apnTokens: null,
			fcmTokens: null
		}
	}

	prepareValidateField() {
		this.validateField = {
			login: {
				account: this.VF('account'),
				password: this.VF('password'),
			},
		}
	}
}

module.exports = UnnameBean;
