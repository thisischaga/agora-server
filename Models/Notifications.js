const { required } = require('joi');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require:true,
    },
    userId: {
        type: String,
        required: true,
    },
    to: {
        type: String,
        required: true,
    },
    userPP: {
        type: String,
        required: true,
    },    
    message: {
        type: String,
        required: true,
    },   
    isRead: {
        type: Boolean,
        required: true,
    },   
    post: {
        type: {},
        required: false,
    },   
    notifType: {
        type: String,
        required: true,
    },   
    createdAt: {
        type: Date,
        require: true,
    },
});
  
module.exports = mongoose.model('Notifications', userSchema);
