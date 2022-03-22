import mongoose from 'mongoose';
import config from 'nconf';
import logger from '../log';
const target = config.get('EXECUTE_TARGET');
const {MONGO_USERNAME, MONGO_PASSWORD, MONGO_HOST_PORT, MONGO_NAME, MONGO_DBPOOL} = config.get(target);

//need to add api of create db, and then setup connection
let start = function(cb) {
  logger.info('[DB] Connecting database');
  //promis setting
  mongoose.Promise = require('bluebird');
  //db options: http://mongoosejs.com/docs/connections.html
  const options = {
    native_parser: true ,
    poolSize: MONGO_DBPOOL, 
    reconnectTries: Number.MAX_VALUE,
    user: MONGO_USERNAME,
    pass: MONGO_PASSWORD,
    useNewUrlParser: true,
    useCreateIndex: true,
    //replset: { replset: REPLICASET_MEMBER },
    //useMongoClient: true,
  }
  mongoose.connect(`mongodb://${MONGO_HOST_PORT.toString()}/${MONGO_NAME}`, options);
  let db = mongoose.connection;
  db.on('on', console.error.bind(console), 'connection error');
  db.once('open', ()=>{
    cb();
  });
}

module.exports = start;
module.exports.mongo = mongoose;
