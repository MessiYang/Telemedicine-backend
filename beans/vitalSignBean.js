import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			patientId: null,
      startTime: null,
      endTime: null,
			doctorId: null,
			outpatientId: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			getLatest: {
				patientId: this.VF('_id')
			},
			
		}
	}
}

module.exports = UnnameBean;