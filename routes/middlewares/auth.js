let router = require('express')();
import xss from 'xss';
import {getTokenAndVerify} from '../../services/accountService';
import errorMsg from '../../models/type/mongooseErrorCode';
import {failResponseForm} from '../../utils/stringUtil';
import packageJson from '../../package.json';

const NODE_HOST_COMMON_ROUTES = `/v${packageJson.version}`;
//import config from 'nconf';
//const target = config.get('EXECUTE_TARGET');
//const {DEPLOY_PREFIX} = config.get(target);

router.use((req, res, next) => {
	req.requestTime = Date.now();
	let reqControllerPath = req.path.replace(NODE_HOST_COMMON_ROUTES, '');
	// logger.info('[REQUEST] path: ', req.path);
	// logger.info('[REQUEST] url: ', req.url);
	// logger.info('[REQUEST] query: ', JSON.stringify(req.query));
	if (req.headers.scope === '_id') {
		req.body.user = {
			"_id": req.headers._id,
			"role": [
				req.headers.role
			],
			"name": "Administrator",
			"code": "e",
			"companyId": req.headers.companyId,
		}
		return next();
	}
	if (req.method === 'GET' && reqControllerPath.includes(	'/apidoc')) {
		return next();
	}
	if (req.method === 'GET' && req.query.filename) {
		//console.log('no xss: ',req.query.filename);
		req.query.filename = xss(req.query.filename);
		//console.log('xss: ',req.query.filename);
	}
	if ([ '/account/signup',
				'/account/checkVerifyCode',
				'/account/resendVerifyCode',
				'/account/login',
				'/account/refreshToken',
				'/account/checkAppVersion',
				'/account/forgetPassword',
				'/account/resetPassword',
				'/appointment/chome',
				'/account/apiHealth',
				'/account/siteVerify',
				'/meeting/testApns',
				'/log/createAppLog',
				'/report/downloadRecordFilesZip',
				'/report/downloadRecording',
				'/payment/dpayNotifyServer',
				'/payment/dpayCallback',
		].includes(reqControllerPath)) {
		return next();
	}
	getTokenAndVerify(req, res, (err) => {
		if (err || !req.body.user) {
			let e, response;
			switch(err.name) {
				default:
					err.name = 'Authenticate';
				break;	
				case 'TokenExpiredError':
				case 'JsonWebTokenError':
					e = errorMsg(err);
					response = failResponseForm(e);
					return res.status(400).send(response);
			}
		} else {
			return next();
		}
	});
});

module.exports = router;
