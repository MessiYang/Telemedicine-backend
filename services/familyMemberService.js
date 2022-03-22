
const mongoose = require('mongoose');

const FamilyMemberModel = require('../models/familyMemberModel');
const relationshipType = require('../models/type/relationshipType');

function createFamilyMemberList(bean, user, callback){
    let { input, output } = bean;
    
    let saveData = {
      'customerID': mongoose.Types.ObjectId(input.customerID),
    }
  
    if(!input.memberList || !input.memberList.length) return callback && callback({name: 'ParamMalformedError'})
    
    for(let i = 0; i < input.memberList.length; i++) {
        if(!(input.memberList)[i].customerID) return callback && callback({name: 'ParamMalformedError'});
        if(!(input.memberList)[i].relationship) return callback && callback({name: 'ParamMalformedError'});
    }

    saveData.memberList = input.memberList;

    // 提前準備傳遞下一個func需使用的參數
    input.patientId = input.customerID;

    new FamilyMemberModel(saveData).save((err, result) => {
        if (err) return callback && callback(err);
        if (!result) return callback && callback({ name:'CreateError' });
        
        // 提前準備傳遞下一個func需使用的參數
        input.relationalfamilyMemberID = result._id;

        return callback && callback(null);
    });
}

/**
 * 
 * Goal. 列出家族成員表，根據customerID或者relationalfamilyMemberID，如兩者皆沒輸入則列出所有customer家族成員表。
 * Annotator. Jack Hu
 * Date. 20211228
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子
 * @param {Object} user -> 使用者資料 
 * @param {Function} callback 
 * 
 */
// REVIEW: 理論上應該要區分誰能拿到getAll，誰不能拿。
function getFamilyMemberList(bean, user, callback){
    let { input, output } = bean;

    let where = {
        'valid': true,
    }

    if(input.relationalfamilyMemberID) where._id = input.relationalfamilyMemberID;
    if(input.customerID) where.customerID = input.customerID;

    FamilyMemberModel
        .find(where)
        .select('-__target -__targetVer -valid -modifyTime -createTime -memberList._id')
        .exec((err, result) => {
            if(err) return callback && callback(err);
            if(!result) return callback && callback({ name:'DataNotFound' });

            output.result = result;
            return callback && callback(null);
        });
}

function updateFamilyMemberList(bean, user, callback) {
    let { input, output } = bean;

    let where = {
        'customerID': mongoose.Types.ObjectId(input.customerID),
        'valid': true,
    };

    if(!input.memberList || !input.memberList.length) return callback && callback({name: 'ParamMalformedError'});
    
    // TODO: 應防呆每個子元素中customerID是否重複。
    for(let i = 0; i < input.memberList.length; i++) {
        if(!input.memberList[i].customerID) return callback && callback({name: 'ParamMalformedError'}); 
        if(!input.memberList[i].relationship) return callback && callback({name: 'ParamMalformedError'}); 
    }

    let updateData = {};
    updateData.memberList = input.memberList;

    FamilyMemberModel
        .update(
            where, 
            { $set: updateData }, 
            { upsert: false }, 
            (err, result)=> {
                if(err) return callback && callback(err);
                if(!result) return callback && callback({name: 'UpdateError'});
                        
                // 提前準備傳遞下一個func需使用的參數
                input.relationalfamilyMemberID = '';

                return callback && callback(null);
            }
        );
}

function removeFamilyMemberList(bean, user, callback) {
    let { input, output } = bean;
    let where = {
        'customerID': input.customerID,
        'valid': true,
    }
    let updateData = {
        'valid': false
    };
    
    // 提前準備傳遞下一個func需使用的參數
    input.patientId = input.customerID;

    FamilyMemberModel
        .update(
            where, 
            { $set: updateData }, 
            { upsert: false }, 
            (err, result)=> {
            if(err) return callback && callback(err);
            if(!result) return callback && callback({ name:'UpdateError' });

            return callback && callback(null);
        });
}

/**
 * 
 * Goal. 確認custormerID是否重複，如重複則回傳資料已存在。
 * Annotator. Jack Hu
 * Date. 20211227
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子
 * @param {Object} user -> 使用者資料
 * @param {Function} callback 
 *  
 */
function checkRepeatFamilyMemberListByCustomerID(bean, user, callback) {
    let { input } = bean;
    let where = {
        'customerID': input.customerID,
        'valid': true,
    }

    FamilyMemberModel
        .find(where)
        .select('customerID')
        .exec((err, result) => {
            if(err) return callback && callback(err);
            if(result && result.length) return callback && callback({ name:'DataExists' });
            
            return callback && callback(null);
        });
}

/**
 * 
 * Goal. 取得家族關係型別的定義表。
 * Annotator. Jack Hu
 * Date. 20211227
 * 
 * @param {Object} bean -> 資料傳遞與驗證的種子 
 * @param {Function} callback 
 * @returns 
 * 
 */
function getRelationshipTypeList(bean, callback) {
    let { input, output } = bean;

    output.result = relationshipType.toOutput();
    return callback && callback(null);
}

function checkRelationshipType(bean, callback) {
    let { input, output } = bean;
    
    if(!input.memberList || !input.memberList.length) return callback && callback({name: 'ParamMalformedError'});
    if(!input.relationship) return callback && callback({name: 'ParamMalformedError'});
     
    // ['2000', '1000', '501', '500', '101', '100','50', '20', '9999']
    let relationshipTypeArray = relationshipType.toValues();

    for(let i = 0; i < input.memberList.length; i++) {
        let _tmp = relationshipTypeArray.findIndex((ele)=> ele == String(input.memberList[i].relationship));
        if(_tmp === -1) return callback && callback({name: 'ParamMalformedError'}); 
    }

    return callback && callback(null);
} 

module.exports = {
    create: createFamilyMemberList,
    list: getFamilyMemberList,
    update: updateFamilyMemberList,
    remove: removeFamilyMemberList,
    checkRepeatByCustomerID: checkRepeatFamilyMemberListByCustomerID, 
    getRelationshipType: getRelationshipTypeList,
    checkRelationshipType: checkRelationshipType, 
}
