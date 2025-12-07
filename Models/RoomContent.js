const mongoose = require ('mongoose');


const userSchema = new mongoose.Schema({

    roomName: {
        type: String,
        require: true,
    },
    roomPP: {
        type: String,
        require: true,
    },
    roomId:{
        type: String,
        require: true,
    },
    
    authorId:{
        type: String,
        require: true,
    },
    authorName: {
        type: String,
    },
    authorPP: {
        type: String,
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