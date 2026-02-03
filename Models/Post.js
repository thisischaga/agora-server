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
    post:{
        type: {},
        require: true,
    },
    createdAt:{
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
 
    favoris: {
        type: [],
        require: true,
    },                                                                                                                                                                                                                                                                                                                           

})


module.exports = mongoose.model('Post', userSchema);