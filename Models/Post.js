const mongoose = require ('mongoose');


const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        require: true,
        index: true,
    },
    username: {
        type: String,
        require: true,
        index: true,
    },
    userPP: {
        type: String,
        require: false,
        index: true,
    },
    post:{
        type: {},
        require: true,
        index: true,
    },
    publicId:{
        type: String,
        require: false,
        index: true,
    },
    createdAt:{
        type: String,
        require: true,
        index: true,
    },

    postLike:{
        type: [String],
        require: true,
        index: true,
    },
    postComment:{
        type: [{}],
        require: false,
        index: true,
    },   
    views:{
        type: [String],
        require: true,
        index: true,
    },        
    sharing:{
        type: [String],
        require: true,
        index: true,
    },  
 
    favoris: {
        type: [],
        require: true,
        index: true,
    },                                                                                                                                                                                                                                                                                                                           

}, {timestamps: true})


module.exports = mongoose.model('Post', userSchema);