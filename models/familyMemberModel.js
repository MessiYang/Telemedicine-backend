import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import relationshipType from './type/relationshipType';

let UnnameModel = new BaseModel({
    
    customerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        index: true,
    },

    memberList: [
        {
            customerID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Customer',
                index: true,
            }, 
            relationship: {
                type: String,
                enum: relationshipType.toValues(),
            },
            isMainContact: {
                type: Boolean,
                default: false,
            }
        }
    ]
},{
    versionKey: false,
    collection: 'FamilyMember',
});

module.exports = mongoose.model('FamilyMember', UnnameModel);