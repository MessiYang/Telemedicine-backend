var logger = require('../log');
var config = require('nconf');
var async = require('async');
//var settingsModel = require('../../models/settingsModel');
//var accountModel = require('../../models/accountModel');
//var governmentModel = require('../../models/governmentModel');
//var GovernmentType = require("../../models/type/RoleType").government;

const PATH = '../defaultSettings';

var start =  function(cb) {
	logger.info('[DB] Starting data recover');
  let ids = {};
  let functionlist = [];
  let target = config.get('EXECUTE_TARGET');
  let files = config.get(target).DEFAULT_SETTINGS || [];
  files.forEach((file) => {
    let results = require(`${PATH}/${file}.json`).default;
    results.forEach((result) => {
      let table = result.table;
      let datas = result.datas;
      let target = `${datas.__target}_${file}`;
      let targetVer = (datas.__targetVer || 1);
      let source = datas.data;
      let attach = datas.file ? require(`${PATH}/${datas.file}.json`) : {};
      functionlist.push((callback) => {
        let model = null;
        try {
          model = require(`../../models/${table}Model`);
        } catch (err) {
          console.error(err);
          return callback();
        }
        let attachs = [];
        if (Array.isArray(attach)) {
          attachs = attachs.concat(attach);
        } else {
          attachs.push(attach);
        }
        model.findOne({__target: new RegExp(target)}, (error, result) => {
          if (result && result['__targetVer'] >= targetVer) {
            ids[target] = result._id;
            return callback();
          } else {
            for(let i=0; i<attachs.length; ++i){
              let end = (i==attachs.length-1);
              let ltarget = (attachs.length<=1?target:`${target}${i}`);
              let ltargetVer = targetVer;
              let lattach = attachs[i];
              model.findOne({__target: ltarget}, (e1, r1) => {
                if (e1) {
                  logger.info('[DB] data recover ERROR\n', e1);
                  return cb();
                }
                if (!r1) {
                  Object.keys(source).forEach((key) => {
                    let value = source[key];
                    if (typeof value == 'string' && value.startsWith('__FK_')) {
                      value = ids[`${value.substr(5)}_${file}`] || null;
                    }
                    lattach[key] = value;
                  });
                  lattach['__target'] = ltarget;
                  lattach['__targetVer'] = ltargetVer;
                  new model(lattach).save((e2, r2) => {
                    if (e2) {
                      console.error(e2);
                    } else {
                      ids[ltarget] = r2._id;
                    }
                    if(end) return callback();
                  });
                } else {
                  ids[ltarget] = r1._id;
                  if (ltargetVer > (r1.__targetVer||0)) {
                    Object.keys(lattach).forEach(function (attachKey) {
                      r1[attachKey] = lattach[attachKey];
                    });
                    Object.keys(source).forEach(function (key) {
                      let value = source[key];
                      if (typeof value == 'string' && value.startsWith('__FK_')) {
                        value = ids[`${value.substr(5)}_${file}`] || null;
                      }
                      r1[key] = value;
                    });
                    r1['__target'] = ltarget;
                    r1['__targetVer'] = ltargetVer;
                    r1.save(function(e2) {
                      if (e2) {
                        console.error(e2);
                      }
                      if(end) return callback();
                    });
                  } else {
                    if(end) return callback();
                  }
                }
              });
            }
          }
        });
      });
    });
  });

	async.series(functionlist, function(err){
		if (err) {
			console.error(err);
		}/*
		Object.keys(ids).forEach(function(id) {
			if (id.startsWith('company')) {
				var companyId = ids[id];
				settingsModel.find(
					{ companyId: mongoose.Types.ObjectId(companyId), valid: true, }
				).exec(function(err, results) {
					if (!err && results) {
						results.forEach(function(result) {
							config.set(`${result.code}${companyId}`, result.value);
						});
					}
				});
			}
		});*/
		//主管機關設定
		/*var iids = {};
		var governmentsConf = require('../governmentsConf.json');
		governmentsConf.map(function(gov){
			if (gov.valid) {
				async.series([
					function(cbk){
						accountModel.findOneAndUpdate(
							{__target: `account_${gov.code}`},
							{ $set: {
									account: gov.account.toLowerCase(),
									password: gov.password,
									__target: `account_${gov.code}`,
									valid: true,
							}},
							{ upsert: true, new: true },
							function(err, account) {
								if (err) {
									console.log(err);
								} else {
									iids[`account_${gov.code}`] = account._id;
								}
								return cbk();
							}
						);
					},
					function(cbk){
						governmentModel.findOneAndUpdate(
							{__target: `gov_${gov.code}`},
							{ $set: {
									name: gov.name,
									personalId: gov.code,
									role: [GovernmentType.GOV.value],
									company: gov.company.map(c => ids[`company___${c}`]),
									accountId: iids[`account_${gov.code}`],
									__target: `gov_${gov.code}`,
									valid: true,
							}},
							{ upsert: true, new: true },
							function(err, government) {
								if (err) {
									console.log(err);
								}
								return cbk();
							}
						);
					},
				], function(err, result){
					
				});
			}
		});*/
		return cb();
	});

};

module.exports = start;