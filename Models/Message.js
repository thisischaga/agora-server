const { required } = require('joi');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    senderId: {
        type: String,
        required: true
    },
    receiverId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    isRead: {
        type: Boolean,
        default: false
    },
    participants: {
        type: [String],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', userSchema);