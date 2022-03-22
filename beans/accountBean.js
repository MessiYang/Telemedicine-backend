import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			account: null,
			password: null,
			token: null,
			role: null,
			mobile: null,
			userType: null,
			name: null,
			companyId: null,
			verifyCode: null,
			accountId: null,
			companyCode: null,
			appName: null,
			version: null,
			bulidNumber: null,
			platform: null,
			apnToken: null,
			fcmToken: null,
			oldPassword: null,
			newPassword: null,
			department: null,
			departmentCode: null,
			isConnectNote: null,
			doctorId: null,
			briefIntro: null,
			patientId: null,
			personalId: null,
			where: null,
			response: null,
			hospital: null,
			hospitalCode: null,
			updateLevel: null,
			email: null,
			birthday: null,
			voipToken: null,
			// relationalPatientId: null,
			relationalfamilyMemberID: null,
			wardCode: null,
			wardName: null,
			// relationship: null,
			// isMainContact: null,
			branchTag: null,
			salt: null,
			deptCode: null,
			regDateTime: null,
			noonNo: null,
			room: null,
			suggestTime: null,
			waitNo: null,
			remark: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			login: {
				account: this.VF('account'),
				password: this.VF('password'),
			},
			createDoctor: {
				role: this.VF('required'),
				account: this.VF('account'),
				password: this.VF('password'),
			},
			updateDoctor: {
				doctorId: this.VF('_id'),
				accountId: this.VF('_id'),
			},
			removeDoctor: {
				doctorId: this.VF('_id'),
				accountId: this.VF('_id'),
			},
			createPatient: {
				role: this.VF('required'),
				mobile: this.VF('required'),
				password: this.VF('password'),
				birthday: this.VF('birthdayCheck'),
				personalId: this.VF('personalIdOrForeignIdCheck'),
			},
			updatePatient: {
				patientId: this.VF('_id'),
				accountId: this.VF('_id'),
				birthday: this.VF('birthdayCheck'),
				personalId: this.VF('personalIdOrForeignIdCheck'),
			},
			updatePatientForApp:{
				birthday: this.VF('birthdayCheck'),
				personalId: this.VF('personalIdOrForeignIdCheck'),
			},
			removePatient: {
				patientId: this.VF('_id'),
				accountId: this.VF('_id'),
			},
			signUp: {
				role: this.VF('required'),
				companyCode: this.VF('required'),
				password: this.VF('password'),
				birthday: this.VF('birthdayCheck'),
				personalId: this.VF('personalIdOrForeignIdCheck'),
			},
			checkVerifyCode:{
				accountId: this.VF('_id'),
				verifyCode: this.VF('verifyCode'),
			},
			forgetPassword:{
				account: this.VF('account')
			},
			resetPassword:{
				account: this.VF('account'),
				verifyCode: this.VF('verifyCode'),
				password: this.VF('password'),
			},
			updatePassword:{
				oldPassword: this.VF('password'),
				newPassword: this.VF('password'),
			},
			resendVerifyCode:{
				account: this.VF('account'),
			},
		}
	}
}

module.exports = UnnameBean;
