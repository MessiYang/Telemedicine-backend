import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			appointmentId: null,
			patientId: null,
      meetingStartTime: null,
			meetingEndTime: null,
      isReceiveCalling: null,
      reserveId: null,
      familyIdList: null,
			isDebug: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			createReserve: {
				patientId: this.VF('_id'),
				meetingStartTime: this.VF('date'),
				meetingEndTime: this.VF('date'),
			},
			replyReserve: {
				reserveId: this.VF('_id'),
			},
		}
	}
}

module.exports = UnnameBean;