
const { async } = require('./base/baseController');
const BaseController = require('./base/baseController').default;

const FamilyMemberBean = require('../beans/familyMemberBean');

const { updatePatient } = require('../services/userService');

const { 
    create, 
    list, 
    update, 
    remove,
    checkRepeatByCustomerID,
    getRelationshipType,
} = require('../services/familyMemberService');

/**
 * 
 * Goal. 設置有關familyMember API
 * Annotator. Jack Hu
 * Date. 20211227
 * 
 */
class Controller extends BaseController {

	list(req, res, next) {
		let bean = new FamilyMemberBean();

		bean.bind(req, null);
		if(bean.hasError()) return res.json(super.fail(bean.errors));

        async.waterfall([
            async.apply(list, bean, req.body.user),
        ], (err, result)=> {
            if(err) {
                return res.json(super.fail(err));
            } 
            return res.json(super.success(bean.output.result));
        });
	}
    // TODO: create及updatePatient應該要用transaction綁再一起。 
	create(req, res, next) {
		let bean = new FamilyMemberBean();
		
        bean.bind(req, 'create');
		if(bean.hasError()) return res.json(super.fail(bean.errors));

        async.waterfall([
            async.apply(checkRepeatByCustomerID, bean, req.body.user),
            async.apply(create, bean, req.body.user),
            async.apply(updatePatient, bean),
        ], (err, result)=> {
            if(err) {
                return res.json(super.fail(err));
            } 
            return res.json(super.success());
        })
	}

	update(req, res, next) {
		let bean = new FamilyMemberBean();
		
        bean.bind(req, 'update');
		if(bean.hasError()) return res.json(super.fail(bean.errors));
		
        async.waterfall([
            async.apply(update, bean, req.body.user),
        ], (err, result)=> {
            if(err) {
                return res.json(super.fail(err));
            } 
            return res.json(super.success());
        });
	}

	remove(req, res, next) {
		let bean = new FamilyMemberBean();
		
        bean.bind(req, 'remove');
		if (bean.hasError()) return res.json(super.fail(bean.errors));

        async.waterfall([
            async.apply(remove, bean, req.body.user),
            // async.apply(updatePatient, bean),
        ], (err, result)=> {
            if(err) {
                return res.json(super.fail(err));
            } 
            return res.json(super.success(bean.output.result));
        });
	}

    getRelationshipType(req, res, next) {
		let bean = new FamilyMemberBean();
		
        bean.bind(req, null);
		if (bean.hasError()) return res.json(super.fail(bean.errors));

		async.waterfall([
			async.apply(getRelationshipType, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
}

module.exports.path = function(router) {
    const ctr = new Controller();
	
    router
        .route('/create')
        .post(ctr.create);

	router
        .route('/list')
        .post(ctr.list);

	router
        .route('/update')
        .post(ctr.update);
    
    // router
    //     .route('/remove')
    //     .post(ctr.remove);

    router
        .route('/getRelationshipType')
        .post(ctr.getRelationshipType);
};
