const mongoose = require ('mongoose');


const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        require: true
    },
    username: {
        type: String,
        require: true,
    },
    userPP: {
        type: String,
        require: false,
    },
    followers: {
        type: [String],
        require: true,
    },
    post: {
        type: String,
        require: true,
    },
    postText: {
        type: String,
        require: false,
    },
    postPicture: {
        type: String,
        require: false,
    },
    title: {
        type: String,
        require: false,
    },
    createdAt:{
        type: String,
        require: true,
    },
    
    statut:{
        type: String,
        require: true,
    },
    titleImg:{
        type: String,
        require: true,
    },
    postLike:{
        type: [String],
        require: true,
    },
    postComment:{
        type: [{}],
        require: false,
    },   
    views:{
        type: [String],
        require: true,
    },        
    sharing:{
        type: [String],
        require: true,
    },                                                                                                                                                                                                                                                                                                                                 

})


module.exports = mongoose.model('Post', userSchema);