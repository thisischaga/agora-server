const { required } = require('joi');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require:true,
        index: true,
    },
    userEmail: {
        type: String,
        required: true,
        index: true,
    },
    userPassword: {
        type: String,
        required: true,
        index: true,
    },
    userPP: {
        type: String,
        required: false,
        index: true,
    },
    userBirthday: {
        type: String,
        required: true,
        index: true,
    },
    followers: {
        type: [],
        require: true,
        index: true,
    },
    following: {
        type: [],
        require: true,
        index: true,
    },
    amis: {
        type: [],
        require: true,
        index: true,
    },
    socketId: {
        type: String,
        require: true,
        index: true,
    },
    notifications: {
        type: [],
        require: true,
        index: true,
    },
    messages: {
        type: [],
        require: true,
        index: true,
    },
    createdAt: {
        type: String,
        require: true,
        index: true,
    },
}, {timestamps: true});
  
module.exports = mongoose.model('User', userSchema);
