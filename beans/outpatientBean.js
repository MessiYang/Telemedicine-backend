import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			department: null,
      startTime: null,
      endTime: null,
			doctorId: null,
			outpatientId: null,
			status: null,
			meetingNumber: null,
			lastCreateTime: null,
			isAccept: null,
			queryStartTime: null,
			daysRange: null,
			companyId: null,
			appointmentId: null,
			outpatientList: null,
			socketId: null,
			code: null,
			vidyoRoomUrl: null,
			vidyoPin: null,
			numberLimit: null,
			doctorName: null,
			doctorIntro: null,
			roomCode: null,
			isApplyToVHC: null,
			isApplyToDpay: null,
			isCounselingClinic: null,
      counselingPrice: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			list:{
				queryStartTime: this.VF('date'),
				daysRange: this.VF('required')
			},
			// create: {
			// 	doctorId: this.VF('_id'),
      //   startTime: this.VF('date'),
      //   endTime: this.VF('date'),
			// },
			update: {
				outpatientId: this.VF('required')
			},
			delete: {
				outpatientId: this.VF('required')
			},
			end: {
				outpatientId: this.VF('_id')
			},
			cancelCalling: {
				appointmentId: this.VF('_id'),
				//meetingNumber: this.VF('meetingNumber'),
				status: this.VF('required')
			},
			replyInvite: {
				isAccept: this.VF('isAccept'),
				//meetingNumber: this.VF('meetingNumber')
			},
			readInviteRecord: {
				lastCreateTime: this.VF('date')
			},
		}
	}
}

module.exports = UnnameBean;