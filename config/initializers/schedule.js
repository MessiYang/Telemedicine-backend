import applicationSchedule from '../../schedules/applicationSchedule';
import dir from 'require-dir';
import cluster from 'cluster';
import logger from '../log';
import jobs from '../scheduleConf';
import config from 'nconf';
const target = config.get('EXECUTE_TARGET');
const {RUN_SCHEDULE_JOBS} = config.get(target);
let DOCKER_RUN_SCHEDULE_JOBS = process.env.IS_SCHEDULE;
const JOB_PATH = '../../schedules/jobs';
const scheduleJobs = dir(JOB_PATH);

let start = function(cb) {
	logger.info('[SCHEDULE] DOCKER_RUN_SCHEDULE_JOBS: ', DOCKER_RUN_SCHEDULE_JOBS);
	if((cluster.worker && cluster.worker.id == '1') || (DOCKER_RUN_SCHEDULE_JOBS == true) || (DOCKER_RUN_SCHEDULE_JOBS == 'true') || (RUN_SCHEDULE_JOBS == true)) {
		logger.info('[SCHEDULE] Starting schedule initialization !!!');
		if(cluster.worker) logger.info('[SCHEDULE] cluster.worker.id: ', cluster.worker.id);
		jobs.forEach((job) => {
			if (Object.keys(scheduleJobs).indexOf(job.jsName) != -1) {
				if (job.active) {
					applicationSchedule.create(job.cron, require(`${JOB_PATH}/${job.jsName}`));
				}
			} else {
				logger.error('[SCHEDULE] Job[' + job.name + '] not found');
			}
		});
		cb();
	}else{
		cb();
	}
}

module.exports = start;
