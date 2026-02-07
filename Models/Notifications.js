const { required } = require('joi');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require:true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    to: {
        type: String,
        required: true,
        index: true,
    },
    userPP: {
        type: String,
        required: true,
        index: true,
    },    
    message: {
        type: String,
        required: true,
        index: true,
    },   
    isRead: {
        type: Boolean,
        required: true,
        index: true,
    },   
    post: {
        type: {},
        required: false,
        index: true,
    },   
    notifType: {
        type: String,
        required: true,
        index: true,
    },   
    createdAt: {
        type: Date,
        require: true,
        index: true,
    },
}, {timestamps: true});
  
module.exports = mongoose.model('Notifications', userSchema);
