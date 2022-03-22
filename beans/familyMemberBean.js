
const BaseBean = require('./base/baseBean').default;

/**
 * 
 * Goal. 在操作FamilyMember collection之前，驗證進來的資料是否滿足規範。
 * Annotator. Jack Hu
 * Date. 20211227
 * 
 */
class UnnameBean extends BaseBean {

	constructor() {	
        super();

		this.input = {
			...this.input,

			customerID: null,
			memberList: null,
			relationalfamilyMemberID: null,
		}
	}

	prepareValidateField() {

		this.validateField = {
			create: {
				customerID: this.VF('required'),
				memberList: this.VF('required'),
            },
            update: {
                customerID: this.VF('required'),
				memberList: this.VF('required'),
			},
			remove: {
				customerID: this.VF('required'),	
			}
		}
	}
}

module.exports = UnnameBean;