import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			departmentId: null,
			name: null,
			code: null
		}
	}

	prepareValidateField() {
		this.validateField = {
			create: {
				name: this.VF('required'),
				code: this.VF('required'),
      },
      update: {
				departmentId: this.VF('required'),
			},
		}
	}
}

module.exports = UnnameBean;