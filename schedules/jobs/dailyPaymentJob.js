import util from 'util';
import async from 'async';
import moment from 'moment';
import config from 'nconf';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import ReportBean from '../../beans/reportBean';
import {checkAppointmentPriceAndCard, mapPaymentList} from '../../services/paymentService';


const target = config.get('EXECUTE_TARGET');
const {RUN_DOWNLOAD_RECORDS_JOB} = config.get(target);

function DailyPaymentJob() {
  baseJob.apply(this, arguments);
}

util.inherits(DailyPaymentJob, baseJob);

let job = new DailyPaymentJob('000001', 'dailyPaymentJob', ()=>{
    logger.info('[Job] DailyPaymentJob job start ...');
    let bean = new ReportBean();
    let {input} = bean;
    input.queryStartTime = moment().startOf('day');
    input.daysRange = 1;
    logger.info('[Job] DailyPaymentJob job, input:', JSON.stringify(input));
    async.waterfall([
			async.apply(checkAppointmentPriceAndCard, bean),
			async.apply(mapPaymentList, bean),
    ], (err) => {
      if (err) {
        return logger.info('[Job] DailyPaymentJob err: ', err);
      } else {
        return logger.info('[Job] DailyPaymentJob job end ...');
      }
    });
});

module.exports = job;