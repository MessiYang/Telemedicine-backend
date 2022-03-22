import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			queryStartTime: null,
      daysRange: null,
      doctorId: null,
      companyId: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			downloadConsultingRecordsExcel: {
				queryStartTime: this.VF('date'),
				daysRange: this.VF('required'),
			},
		}
	}
}

module.exports = UnnameBean;
