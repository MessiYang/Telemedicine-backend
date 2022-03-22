import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			isReceiveNotification: null,
			role: null,
			apnToken: null,
			fcmToken: null,
			patientId: null,
			doctorId: null,
			isDebug: null,
			companyId: null,
			personalId: null,
			mobile: null,
			departmentCode: null,
			_id: null,
			msgString: null,
			isToShareRole: null,
			appointmentId: null,
			account: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			setNotification: {
				isReceiveNotification: this.VF('required')
			},
			sendMsgToMeetingMember:{
				msgString: this.VF('required')
			},
		}
	}
}

module.exports = UnnameBean;