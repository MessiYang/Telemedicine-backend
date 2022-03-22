import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			zoomAccountId: null,
      zoomAccount: null,
      password: null,
      userId: null,
      APIKey: null,
      APISecret: null,
      SDKKey: null,
      SDKSecret: null,
      doctorIdUsed: null,
			companyId: null,
			expiryDate: null,
			VIDYO_HOST: null,
			VIDYO_KEY: null,
			VIDYO_APPID: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			create: {
				//zoomAccount: this.VF('required'),
			},
			update: {
				zoomAccountId: this.VF('required')
			},
		}
	}
}

module.exports = UnnameBean;