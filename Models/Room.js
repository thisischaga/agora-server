// models/Room.js
const mongoose = require('mongoose');


const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    roomPP: { type: String, required: true },
    bio: { type: String, required: true },
    createdAt: { type: String, required: true },

    owner: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        userPP: { type: String, required: false }
    },

    members: {
        type: [],
        require: false,
    },
});

module.exports = mongoose.model('Room', roomSchema);
