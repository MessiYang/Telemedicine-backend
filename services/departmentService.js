import DepartmentModel from '../models/departmentModel';

export {
  list,
  create,
  update,
  remove,
};

function list(bean, user, callback){
  let {output} = bean;
  let where = {
    'valid': true,
    'companyId': user.companyId,
  }
  DepartmentModel.find(where)
  .select(' -__target -__targetVer -valid')
  .exec((err, result) => {
    if(err) return callback && callback(err);
    if(!result) return callback && callback({name:'DataNotFound'});
    output.result = result;
    callback && callback(null);
  });
}

function create(bean, user, callback) {
  let {input} = bean;
  console.log(input);
  let saveData = {
    'code': input.code,
    'name': input.name,
    'companyId': user.companyId,
  }
  new DepartmentModel(saveData).save((err, result) => {
		if (err) 	return callback && callback(err);
		if (!result) return callback && callback({name: 'CreateError'});
		return callback && callback(null);
	});
}

function update(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.departmentId
  }
  let updateData = input;
  DepartmentModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    return callback && callback(null);
  });
}

function remove(bean, callback){
  let {input} = bean;
  let where = {
    '_id': input.departmentId
  }
  let updateData = {
    'valid': false
  };
  DepartmentModel.update(where, {$set: updateData}, {upsert: false}, (err, result)=>{
    if (err) return callback && callback(err);
    if (!result) return callback && callback({name: 'UpdateError'});
    return callback && callback(null);
  });
}

