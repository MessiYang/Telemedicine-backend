import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			companyCode: null,
			deptCode: null,
			regDateTime: null,
			noonNo: null,
			personalId: null,
			room: null,
			suggestTime: null,
			waitNo: null,
			remark: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			createAppointment: {
				companyCode: this.VF('required'),
				deptCode: this.VF('required'),
				noonNo: this.VF('required'),
				regDateTime: this.VF('required'),
				suggestTime: this.VF('required'),
				waitNo: this.VF('required'),
				personalId: this.VF('required'),
				room: this.VF('required'),
			},
			cancelAppointment: {
				companyCode: this.VF('required'),
				deptCode: this.VF('required'),
				noonNo: this.VF('required'),
				regDateTime: this.VF('required'),
				personalId: this.VF('required'),
				room: this.VF('required'),
			},
		}
	}
}

module.exports = UnnameBean;
