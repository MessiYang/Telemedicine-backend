import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			patientId: null,
      outpatientId: null,
      meetingNumber: null,
      meetingUUID: null,
			status: null,
			appointmentId: null,
			userId: null,
			queryStartTime: null,
			daysRange: null,
			companyId: null,
			doctorId: null,
			startTime: null,
			patientPID: null,
			appointmentDate: null,
			kmuh_hospital: null,
			kmuh_doctorId: null,
			kmuh_deptCode: null,
			kmuh_noonNo: null,
			vidyoRoomUrl: null,
			vidyoPin: null,
			vidyoHost: null,
			vidyoToken: null,
			vidyoResourceId: null,
			departmentCode: null,
			waitNo: null,
			patientHospital: null,
			patientQRCodeData: null,
			room: null,
			mrno: null,		
			patientChName: null,
			patientMobile: null,
			suggestTime: null,
			appointmentNumber: null,
			telemedicineType: null,
			data1: null,
			data2: null,
			companyCode: null,
			VHCToken: null,
			isShowNoFile: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			create: {
        patientId: this.VF('_id'),
        outpatientId: this.VF('_id'),
			},
			hospitalSyncCreate:{
				patientId: this.VF('_id'),
        outpatientId: this.VF('_id'),
			},
			update: {
				appointmentId: this.VF('_id'),
			},
			cancel: {
				appointmentId: this.VF('_id'),
			},	
			hospitalSyncCancel: {
				appointmentId: this.VF('_id'),
			},
			updateStatus: {
        appointmentId: this.VF('_id'),
        status: this.VF('status')
			},
			inviteOutMeeting: {
        //userId: this.VF('_id'),
        //meetingNumber: this.VF('meetingNumber')
			},
			getConsultingRecords:{
				queryStartTime: this.VF('date'),
				daysRange: this.VF('required')
			},
			kickOutMeeting: {
				appointmentId: this.VF('_id'),
				//meetingNumber: this.VF('meetingNumber'),
				status: this.VF('required')
			},
			getRecordingUrl:{
				meetingNumber: this.VF('meetingNumber'),
				startTime: this.VF('date')
			},
			createConsultingAppointment:{
				appointmentDate: this.VF('date'),
				companyCode: this.VF('required')
			},
			cancelConsultingAppointment:{
				appointmentDate: this.VF('date'),
				companyCode: this.VF('required')
			},
			getConsultingAppointment:{
				//appointmentDate: this.VF('date')
			},
		}
	}
}

module.exports = UnnameBean;
