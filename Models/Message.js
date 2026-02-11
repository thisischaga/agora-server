const { required } = require('joi');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    senderId: {
        type: String,
        required: true,
        index: true,
    },
    receiverId: {
        type: String,
        required: true,
        index: true,
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000,
        index: true,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    participants: {
        type: [String],
        required: true,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
}, {timestamps: true});

module.exports = mongoose.model('Message', userSchema);