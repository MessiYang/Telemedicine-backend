import util from 'util';
import async from 'async';
import moment from 'moment';
import config from 'nconf';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import ReportBean from '../../beans/reportBean';
import { getConsultingRecords, getOutpatientRecords} from '../../services/appointmentService';
import { moveRecordFilesToFTPServer ,filterNofileRecord} from '../../services/reportService';
import {connectFTPServer, disconnectFTPServer} from '../../utils/ftpUtil';

const target = config.get('EXECUTE_TARGET');
const {RUN_DOWNLOAD_RECORDS_JOB} = config.get(target);

function DownloadMeetingRecordJob() {
  baseJob.apply(this, arguments);
}

util.inherits(DownloadMeetingRecordJob, baseJob);

let job = new DownloadMeetingRecordJob('000001', 'downloadMeetingRecordJob', ()=>{
    if(!RUN_DOWNLOAD_RECORDS_JOB) return logger.info('[Job] DownloadMeetingRecordJob Off!');
    logger.info('[Job] DownloadMeetingRecordJob job start ...');
    let bean = new ReportBean();
    let {input} = bean;
    input.queryStartTime = moment().startOf('day').subtract(24, 'h');
    input.daysRange = 1;
    logger.info('[Job] DownloadMeetingRecordJob job, input:', JSON.stringify(input));
    //connectFTPServer();
    async.waterfall([
      async.apply(getConsultingRecords, bean, null),
      async.apply(getOutpatientRecords, bean, null),
      async.apply(filterNofileRecord, bean),
      async.apply(moveRecordFilesToFTPServer, bean),
    ], (err) => {
      //disconnectFTPServer();
      if (err) {
        return logger.info('[Job] DownloadMeetingRecordJob err: ', err);
      } else {
        return logger.info('[Job] DownloadMeetingRecordJob job end ...');
      }
    });
});

module.exports = job;