const { required } = require('joi');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require:true,
    },
    userEmail: {
        type: String,
        required: true,
    },
    userPassword: {
        type: String,
        required: true,
    },
    userPP: {
        type: String,
        required: true,
    },
    userBirthday: {
        type: String,
        required: true,
    },
    followers: {
        type: [],
        require: true,
    },
    following: {
        type: [],
        require: true,
    },
    amis: {
        type: [],
        require: true,
    },
    socketId: {
        type: String,
        require: true,
    },
    notifications: {
        type: [],
        require: true,
    },
    messages: {
        type: [],
        require: true,
    },
    favoris: {
        type: [],
        require: true,
    },
    createdAt: {
        type: String,
        require: true,
    },
});
  
module.exports = mongoose.model('User', userSchema);
