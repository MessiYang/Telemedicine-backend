import BaseController, {async} from './base/baseController';
//import path from 'path';
import config from 'nconf';
import MeetingBean from '../beans/meetingBean';
import {createMeeting, listRecords, saveDailyMeetingRecords} from '../services/meetingService';
//import {dbtest} from '../services/accountService';
import {updateUserInMeetingStatus} from '../services/userService';
import {pushMessage} from '../utils/stringUtil';
import {getRoomsReq, addRoomReq} from '../utils/vidyoUtil';
import {xmppSend} from '../utils/xmppUtil';

const target = config.get('EXECUTE_TARGET');
//const {MP4_OUTPUT_FOLDER_PATH} = config.get(target);

class Controller extends BaseController {
	downloadMeetingRecordJob(req, res) {
		let bean = new MeetingBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(saveDailyMeetingRecords, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	createMeeting(req, res) {
		let bean = new MeetingBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			// async.apply(getZoomConfig, bean, req.body.user),
			// async.apply(createMeeting, bean),
			async.apply(updateUserInMeetingStatus, bean, req.body.user, false),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	listRecords(req, res) {
		let bean = new MeetingBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(listRecords, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}
	//下載meeting record video
	// downloadVideo(req, res) {
	// 	if (req.query.filename) {
	// 		const filePath = path.join(__dirname, `${MP4_OUTPUT_FOLDER_PATH}/${req.query.filename}`);
	// 		res.download(filePath);
	// 	} else {
	// 		res.status(401).send('invalid file name');
	// 	}
	// }

	testApns(req, res) {
		let bean = new MeetingBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		console.log('input: ', input)
		async.waterfall([
			//pushMessage(isDebug, apnTokens, fcmTokens, title, payload, msgData, role)
			//async.apply(pushMessage, input.isDebug, input.apnTokens, input.fcmTokens, input.alert, input.payload, input.msgData, 'c'),
			async.apply(xmppSend, 'e5d22a94d7c9ad06c40b4bbe8', 'inviteToJoinMeeting/id/5d22a94d7c9ad06c40b4bbe8', '{"meetingNumber":"795215714","name":"林良傑","department":"骨科"}'),
			//async.apply(getRoomsReq),
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
	let ctr = new Controller();
	router.route('/downloadMeetingRecordJob').post(ctr.downloadMeetingRecordJob);
	router.route('/createMeeting').post(ctr.createMeeting);
	router.route('/listRecords').post(ctr.listRecords);
	//router.route('/downloadVideo').get(ctr.downloadVideo);
	router.route('/testApns').post(ctr.testApns);
};
