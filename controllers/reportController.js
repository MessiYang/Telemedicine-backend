import BaseController, {async} from './base/baseController';
import path from 'path';
import fs from 'fs';
import logger from '../config/log';
import config from 'nconf';
import xss from 'xss';
import querystring from 'querystring';
import ReportBean from '../beans/reportBean';
import {generateConsultingRecordsExcel, downloadRecordFilesWithZip, getRecordFilesWithZipUrl, moveRecordFilesToFTPServer,filterNofileRecord} from '../services/reportService';
import { getConsultingRecords, getOutpatientRecords} from '../services/appointmentService';
import {createUserLogs } from '../services/logService';
import ActionType from '../models/type/actionType';
import {checkRecordFilesDownloadTimeLimit} from '../utils/dateUtil';
import {downloadRecording} from '../utils/vidyoUtil';
import {connectFTPServer, disconnectFTPServer} from '../utils/ftpUtil';

const target = config.get('EXECUTE_TARGET');
const {REPORT_OUTPUT_FOLDER_PATH} = config.get(target);

class Controller extends BaseController {

	downloadConsultingRecordsExcel(req, res) {
		let bean = new ReportBean();
		bean.bind(req, 'downloadConsultingRecordsExcel');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		if(req._remoteAddress) input.remoteAddr = req._remoteAddress;
		async.waterfall([
      async.apply(getConsultingRecords, bean, req.body.user),
			//async.apply(getOutpatientRecords, bean, req.body.user),
			async.apply(generateConsultingRecordsExcel, bean),
			async.apply(createUserLogs, bean, req.body.user, ActionType.EXPORT_MR.value),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
        let {input} = bean;
        if (input.fileName) {
          const filePath = path.join(__dirname, `${REPORT_OUTPUT_FOLDER_PATH}/${input.fileName}`);
					console.log('filePath: ', filePath);
          res.download(filePath);
        } else {
          res.status(401).send('invalid file name');
        }
				//return res.json(super.success(bean.output.result));
			}
		});
	}

	downloadPatientRecordsExcel(req, res) {
		let bean = new ReportBean();
		bean.bind(req, 'downloadConsultingRecordsExcel');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input} = bean;
		if(req._remoteAddress) input.remoteAddr = req._remoteAddress;
		async.waterfall([
      //async.apply(getConsultingRecords, bean, req.body.user),
			async.apply(getOutpatientRecords, bean, req.body.user),
			async.apply(generateConsultingRecordsExcel, bean),
			async.apply(createUserLogs, bean, req.body.user, ActionType.EXPORT_MR.value),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
        let {input} = bean;
        if (input.fileName) {
          const filePath = path.join(__dirname, `${REPORT_OUTPUT_FOLDER_PATH}/${input.fileName}`);
					console.log('filePath: ', filePath);
          res.download(filePath);
        } else {
          res.status(401).send('invalid file name');
        }
				//return res.json(super.success(bean.output.result));
			}
		});
	}

	getConsultingRecordFilesZipUrl(req, res) {
		let bean = new ReportBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getConsultingRecords, bean, req.body.user),
			//async.apply(getOutpatientRecords, bean, req.body.user),
			async.apply(filterNofileRecord, bean),
			async.apply(getRecordFilesWithZipUrl, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	getPatientRecordFilesZipUrl(req, res) {
		let bean = new ReportBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			//async.apply(getConsultingRecords, bean, req.body.user),
			async.apply(getOutpatientRecords, bean, req.body.user),
			async.apply(filterNofileRecord, bean),
			async.apply(getRecordFilesWithZipUrl, bean, req.body.user),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	moveRecordFilesToFTP(req, res) {
		let bean = new ReportBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getConsultingRecords, bean, req.body.user),
			async.apply(getOutpatientRecords, bean, req.body.user),
			async.apply(filterNofileRecord, bean),
			async.apply(moveRecordFilesToFTPServer, bean),
		], (err) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.output.result));
			}
		});
	}

	downloadRecordFilesZip(req, res) {
		const filename = querystring.escape(xss(req.query.filename));
		if (filename) {
			//console.log('[login] setTokenInCookie/start!!  req.body:',req.body.token);
			//console.log('[login] setTokenInCookie/2222  req.body:', req.body.token);
			//if (!checkRecordFilesDownloadTimeLimit(filename)) res.status(401).send('invalid file name');
			//console.log("filename: ", filename);
			let filePath = path.join(__dirname, `../public/reports/${xss(filename)}`);
			res.download(filePath, (err) => {
				if (err) {
					logger.info(`[downloadRecordFilesZip] download err: ${err}`);
					console.log("[downloadRecordFilesZip]err: ", err);
					return res.status(401).send('invalid file name');
				}
				fs.unlinkSync(filePath);
			});
		} else {
			return res.status(401).send('invalid file name');
		}
	}

	downloadRecording(req, res) {
		const filename = querystring.escape(xss(req.query.filename));
		if (filename) {
			console.log("filename: ", filename);
			async.waterfall([
				async.apply(downloadRecording, filename),
			], (err) => {
				if (err) {
					logger.info(`[downloadRecording]11 err: ${err}`);
					return res.json(super.fail(err));
				} else {
					logger.info(`[downloadRecording]11 filename: ${filename}`);
					let filePath = path.join(__dirname, `../public/reports/meetingRecording/${xss(filename)}.mp4`);
					res.download(filePath, (err) => {
						if (err) {
							logger.info(`[downloadRecording] download err: ${err}`);
							console.log("[downloadRecording]err: ", err);
							res.status(401).send('invalid file name');
						}
						fs.unlinkSync(filePath);

						console.log("[downloadRecording] done!!!!!   filename: ", filename);
					});
				}
			});
		} else {
			res.status(401).send('invalid file name');
		}
	}
}

module.exports.path = function(router) {
	let ctr = new Controller();
	router.route('/downloadConsultingRecordsExcel').post(ctr.downloadConsultingRecordsExcel);
	router.route('/downloadPatientRecordsExcel').post(ctr.downloadPatientRecordsExcel);
	router.route('/getConsultingRecordFilesZipUrl').post(ctr.getConsultingRecordFilesZipUrl);
	router.route('/getPatientRecordFilesZipUrl').post(ctr.getPatientRecordFilesZipUrl);
	router.route('/moveRecordFilesToFTP').post(ctr.moveRecordFilesToFTP);
	router.route('/downloadRecordFilesZip').get(ctr.downloadRecordFilesZip);
	router.route('/downloadRecording').get(ctr.downloadRecording);
};
