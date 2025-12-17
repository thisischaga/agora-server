const mongoose = require ('mongoose');


const userSchema = new mongoose.Schema({

    roomId:{
        type: String,
        require: true,
    },
    sender: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        userPP: { type: String, required: false }
    },
    content: {
        type: String,
        require: true,
    },
    createdAt:{
        type: String,
        require: true,
    },
                                                                                                                                                                                                                    
})


module.exports = mongoose.model('RoomContent', userSchema);

