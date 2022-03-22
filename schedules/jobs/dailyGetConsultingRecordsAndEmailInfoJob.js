import util from 'util';
import async from 'async';
import moment from 'moment';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import appointmentBean from '../../beans/appointmentBean';
import { getConsultingRecords, getOutpatientRecords } from '../../services/appointmentService';
import { filterNofileRecord, filterByFileUrl, sendAlert_NoFileUrl } from '../../services/reportService';
 
function dailyGetConsultingRecordsAndEmailInfoJob() {
  baseJob.apply(this, arguments);
}

util.inherits(dailyGetConsultingRecordsAndEmailInfoJob, baseJob);

/**
 * Goal. 創建一個取得遠距後台-影像檔報表內的相關資料，檢查前一日影像檔是否有異常及彙整相關資訊，email通知相關人員。
 * Annotator. Jack Hu
 * Date. 20211207
 * 
 */
let job = new dailyGetConsultingRecordsAndEmailInfoJob('000001', 'dailyGetConsultingRecordsAndEmailInfoJob', ()=>{
    
    logger.info('[Job] dailyGetConsultingRecordsAndEmailInfoJob job start ...');
  
    let bean = new appointmentBean();
    let { input } = bean;
    
    // 把daysRange往前擺，可為了將來僅需改此屬性即可往彙整幾天前之資料。
    input.daysRange = 1;
    // 如果排程非從零晨開始，要注意起始時間，否則撈去資料的日期可能會不正確。
    input.queryStartTime = moment().startOf('day').subtract(input.daysRange, 'days');
    // preset variables - filterNofileRecord function.
    input.isShowNoFile = true;
    
    async.waterfall([
        async.apply(getConsultingRecords, bean, null),
        async.apply(getOutpatientRecords, bean, null),
        async.apply(filterNofileRecord, bean),
        async.apply(filterByFileUrl, bean),
        async.apply(sendAlert_NoFileUrl, bean, 'summary')
    ], (err) => {
      if (err) {
        return logger.info('[Job] dailyGetConsultingRecordsAndEmailInfoJob err: ', err);
      } else {
        return logger.info('[Job] dailyGetConsultingRecordsAndEmailInfoJob job end ...');
      }
    });
});

module.exports = job;