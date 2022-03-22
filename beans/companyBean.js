import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			code: null,
			displayname: null,
      fullname: null,
      address: null,
      phone: null,
      region: null,
      outpatientLimit: null,
      companyId: null,
      companyIds: null,
      serviceGroupId: null,
      clientCode: null,
      employeeIds: null,
      hospitalCode: null,
      isOpenAppointment: null,
      syncAppointmentDays: null,
      meetingSystem: null,
      isSyncAppointment: null,
      agreementURL: null,
      accountLimit: null,
      companyCode: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			create: {
        code: this.VF('required'),
        displayname: this.VF('required'),
        region: this.VF('required'),
      },
      update: {
        companyId: this.VF('_id'),
      },
      createServiceGroup: {
        displayname: this.VF('required'),
      },
      updateServiceGroup: {
        serviceGroupId: this.VF('_id'),
			},
		}
	}
}

module.exports = UnnameBean;