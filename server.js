const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require ('./Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require ('./Congfig/db');
const verifyToken = require ('./Middlewares/verifyTokens');
const Post = require ('./Models/Post');
const multer = require ('multer');
const http = require ('http');

const axios = require('axios');
const RoomContent = require ('./Models/RoomContent');
const Room = require ('./Models/Room');
const { initSocket } = require('./socket');
//const bodyParser = require ('body-parser')
//const authRoutes = require ('./routes/authRoutes');

require('dotenv').config();
connectDB();

const app = express ();
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))
const server = http.createServer(app);
initSocket(server);
const port = 8000;


app.use(express.json({limit: '20mb'}));


//ROUTE POUR L'INSCRIPTION
app.post('/signup', async (req, res) => {
    const {username, userPassword, userEmail, userPP, userBirthday} = req.body;

    const createdAt = new Date();


    let notifications = [];
    let messages = [];
    let favoris = [];
    let amis = [];
    let socketId = null
    
    try {

      const existingUser = await User.findOne({ userEmail });
      if (existingUser) {
        return res.status(400).json(
            { message: "L'email est déjà utilisé ! " }
        );
      }
  
      const hashedPassword = await bcrypt.hash(userPassword, 10);
  
      const newUser = new User({username, userPassword: hashedPassword, userBirthday, 
        userEmail, userPP, socketId, notifications, messages, favoris, amis, createdAt});
      await newUser.save();


    const token = jwt.sign(
        {userId: newUser._id},
        process.env.JWT_SECRET,
        {expiresIn: '24h'}

    )
    res.status(201).json({ message: 'Vous avez créer un profil', token });
    console.log('Un compte a été créé', username);

    } catch (error) {
        console.log('Erreur du serveur', error)
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
// ROUTE POUR LA GESTION DES LOGIN

app.post('/login', async (req,res) =>{
    const {userEmail, userPassword} = req.body;

    try {
        const user = await User.findOne({userEmail});
        if (!user) {

            return res.status(404).json({message: "Utilisateur non trouvé ! "})
        }
        const isMatch = await bcrypt.compare(userPassword, user.userPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }
        
        // Générer un token JWT
        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
    
        )
        res.status(200).json({message: 'connexion réussie',token });
        console.log('Un compte connecté ', userEmail)
        

    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' });
        console.log('Erreur', error)
    }

});

// Gestion du socketId
app.post("/socket/getSocketId", verifyToken, async (req, res) => {
    const { socketId } = req.body;
    const userId = req.user.userId;

    if (!userId || !socketId) {
        return res.status(400).json({ message: "userId ou socketId manquant" });
    }

    try {
        await User.findByIdAndUpdate(
          userId,
          { socketId: socketId },
        );

        res.json({ message: "socketId enregistré 🎉" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nettoyer le socletId à la déconnexion
app.post("/socket/disconnect/getSocketId", async (req, res) => {
  const { socketId } = req.body;

  if (!socketId) {
    return res.status(400).json({ message: "socketId manquant" });
  }

  try {
    await User.updateOne(
        { socketId: socketId },
        { $set: { socketId: null } }
    );


    res.json({ message: "socketId supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//Route pour gérer la suivie des utilisateurs
app.put('/follow',verifyToken, async (req, res) =>{
    try {
        const {authorId} = req.body;

        const followerId = req.user.userId
        const createdAt = new Date().toISOString();

        const userFollowing = await User.findById(followerId);
        const author = await User.findById(authorId);

        if (!userFollowing || !author) {
            return res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (author.followers.includes(followerId)) {
            author.followers.pull(followerId);
            userFollowing.following.pull(authorId);
        }else{
            author.followers.push(followerId);
            userFollowing.following.push(authorId);
            const {username, userPP,} = userFollowing;
            author.notifications.push({username, userPP, message: 'a commencé à vous suivre', createdAt});
        }
        
        await author.save();
        await userFollowing.save();
        const following = userFollowing.following
        const authorFollowers = author.followers
        res.status(201).json({'authorFollowers': authorFollowers, 'userFollowings': following})
        
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});

//Handle amis

app.put('/back_follow',verifyToken, async (req, res) =>{
    try {
        const {authorId} = req.body;

        const followerId = req.user.userId
        const createdAt = new Date().toISOString();

        const userFollowing = await User.findById(followerId);
        const author = await User.findById(authorId);

        if (!userFollowing || !author) {
            return res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        if (userFollowing.followers.includes(authorId)) {
            
            author.followers.pull(followerId);
            userFollowing.followers.pull(authorId);

            author.following.pull(followerId);
            userFollowing.following.pull(authorId);

            author.amis.push(followerId);
            userFollowing.amis.push(authorId);

            const {username, userPP,} = userFollowing;
            author.notifications.push({username, userPP, message: 'vous êtes maintenant amis', createdAt});
        }
        else if (userFollowing.amis.includes(authorId) || author.amis.includes(followerId)) {
            author.amis.pull(followerId);
            userFollowing.amis.pull(authorId);
        }
        else if (userFollowing.following.includes(authorId)) {
            author.followers.pull(followerId);
            userFollowing.following.pull(authorId);
        }
            
        
        await author.save();
        await userFollowing.save();
        const amis = userFollowing.amis

        res.status(201).json(amis)
        
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
//Route pour la gestion du following
app.put('/add_following',verifyToken, async (req, res) =>{
    try {
        const {userId} = req.body;
        const followerId = req.user.userId
        const user = await User.findById(followerId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        else if (user.following.includes(userId)) {
            user.following.pull(userId)
            res.status(200).json({message: 'retiré', retired: true})
        }
        else{
            user.following.push(userId);
            res.status(200).json({message: 'suivi', followed: true})
        }
        await user.save();
        
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
//Route pour récupérer les followers
app.get('/amis/followers', verifyToken, async (req, res) =>{
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const followers = user.followers;
        const followersData = await Promise.all(followers.map(async (followerId) => {
            const followerUser = await User.findById(followerId);
            if (!followerUser) return null
            return{
                id : followerUser._id.toString(),
                username : followerUser.username,
                pp : followerUser.userPP
            }
        }));
        
        const cleanFollowers = followersData.filter(f => f !== null)
        res.json(cleanFollowers);
        
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});

app.get('/followers', verifyToken, async (req, res) =>{
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const followers = user.followers
        res.json(followers)
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
//Route pour récupérer les following
app.get('/following', verifyToken, async (req, res) =>{
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const following = user.following
        res.json(following)
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
//Route pour récupérer les followings dans amis
app.get('/amis/following', verifyToken, async (req, res) =>{
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const following = user.following;

        const followingsData = await Promise.all(following.map(async (followerId) => {
            const followingUser = await User.findById(followerId);
            if (!followingUser) return null;
            return{
                id : followingUser._id.toString(),
                username : followingUser.username,
                pp : followingUser.userPP
            }
        }));
        
        const cleanFollowings = followingsData.filter(f => f !== null)
        res.json(cleanFollowings);
        
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
app.get('/amis', verifyToken, async (req, res) =>{
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const amis = user.amis
        res.json(amis)
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
//Route pour récupérer les amis
app.get('/amis/all_friends', verifyToken, async (req, res) =>{
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({message: 'Utilisateur non trouvé'})
        }
        const amis = user.amis;
        const amisData = await Promise.all(amis.map(async (ami) => {
            const friendUser = await User.findById(ami);
            if (!friendUser) return null
            return{
                id : friendUser._id.toString(),
                username : friendUser.username,
                pp : friendUser.userPP
            }
        }));
        
        const cleanFollowers = amisData.filter(a => a !== null)
        res.json(cleanFollowers);
        
    } catch (error) {
        res.status(500).json({message: 'Erreur interne du serveur'})
        console.log ('Erreur: ', error)
    }
});
//Route pour récupérer les données d'utilisateur après authentification
app.get('/user_data', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId); 
        if (!user) {
            return res.status(401).json({ message: "Utilisateur non trouvé" });
        }
        return res.status(200).json({
            username: user.username,
            userPP: user.userPP,
            userId: user._id,
            notifications: user.notifications,
            followers: user.followers,
            following: user.following,
            amis: user.amis,
        });   
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});
// Route pour gérer les posts
app.post('/publication',verifyToken, async(req, res) => {
    const userId = req.user.userId;
    const {post, postPicture, title, postText, type} = req.body;
    console.log(postPicture)
    
    const createdAt = new Date().toISOString();

    if(type === 'text'){
        if (!postText) {
            return res.status(400).json({ message: "Champs manquants ou invalides" });
        }
    }
    if(type === 'article'){
        if (!post || !title || !postPicture) {
            return res.status(400).json({ message: "Champs manquants ou invalides" });
        }
    }
    
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(401).json({ message: "Utilisateur non trouvé" });
        }
        const {username, userPP, followers} = user;
        const authorFollowers = user.followers;
        const newPost = new Post({username, userPP, followers, post, postText, postPicture, title, userId, createdAt});
        await newPost.save();

        await Promise.all(authorFollowers.map(async (follower) => {
            const followerUser = await User.findById(follower);
            if (followerUser) {
                followerUser.notifications.push({ username, userPP, message: 'a publié un nouveau contenu', createdAt });
                await followerUser.save();
            }
        }));
        //console.log(postLike, postLike.length);
        res.status(201).json({message: "publié",})
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }

});

// Gestion du socketId
app.post("/socket/getSocketId", verifyToken, async (req, res) => {
    const { socketId } = req.body;
    const userId = req.user.userId;

    console.log(socketId);
    console.log(userId);

    if (!userId || !socketId) {
        return res.status(400).json({ message: "userId ou socketId manquant" });
    }

    try {
        await User.findByIdAndUpdate(
          userId,
          { socketId: socketId },
        );

        res.json({ message: "socketId enregistré 🎉" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nettoyer le socletId à la déconnexion
app.post("/socket/disconnect/getSocketId", async (req, res) => {
  const { socketId } = req.body;

  if (!socketId) {
    return res.status(400).json({ message: "socketId manquant" });
  }

  try {
    await User.updateOne(
        { socketId: socketId },
        { $set: { socketId: null } }
    );


    res.json({ message: "socketId supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//Route pour la gestion des likes

app.put('/post/like', verifyToken, async (req, res)=>{

    const {postId, authorId} = req.body;
    const viewerId = req.user.userId;
    const createdAt = new Date().toISOString();

    try {
        const post = await Post.findById(postId);
        const author = await User.findById(authorId);
        const user = await User.findById(viewerId);

        if(!post){
            return res.status(404).json({message: 'post non trouvé !'})
        }
        if(!author){
            return res.status(404).json({message: 'Utilisateur non trouvé !'})
        }
        if(!user){
            return res.status(404).json({message: 'Utilisateur non trouvé !'})
        }
        if(post.postLike.includes(viewerId)){
            post.postLike.pull(viewerId);
            
        }else{
            post.postLike.push(viewerId);   
            const {username, userPP,} = user;
            if(authorId !== viewerId){
                author.notifications.push({username, userPP, message: 'a aimé votre publication', createdAt});
            }
            
            await author.save()
        }
        await post.save();
        const likes = post.postLike;
        res.status(200).json({'likes': likes,})
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})
// Route pour la gestion des réponses de posts
app.put('/post/comment', verifyToken, async(req, res)=>{
    const {commentary, currentPostId, userId, authorId} = req.body
    const createdAt = new Date().toISOString();
    const author = await User.findById(authorId);
    const user = await User.findById(userId);
    try {
        const post = await Post.findById(currentPostId);
        if (!post) {
            return res.status(404).json({message: "Post non trouvé !"})
        }
        if(!author){
            return res.status(404).json({message: 'Utilisateur non trouvé !'})
        }
        if(!user){
            return res.status(404).json({message: 'Utilisateur non trouvé !'})
        }
        
        post.postComment.push({userId, commentary});

        const {username, userPP,} = user;
        author.notifications.push({username, userPP, message: 'a commenté votre publication', createdAt});

        await post.save();
        await author.save();
        
        const commentaires = post.postComment;
        return res.status(200).json({message: "Vous avez commenté ce post !", 'commentaires': commentaires})
        


    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});
// Route pour gérer les partages
app.put('/post/sharing', verifyToken, async(req, res)=>{
    const {currentPostId, userId} = req.body
    try {
        const post = await Post.findById(currentPostId);
        if (!post) {
            return res.status(404).json({message: "Post non trouvé !"})
        }
        else if(!post.sharing.includes(userId)) {
            post.sharing.push(userId);
        }
        
        await post.save();
        const sharing= post.sharing;
        return res.status(200).json({message: "Vous avez partagé ce post !", 'sharing': sharing})


    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});
// Route pour gérer l'affichage des posts dans le frontend

app.get('/posts', verifyToken, async(req,res) =>{
    try {
        const posts = await Post.find().sort({createdAt: -1});
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

// Route pour afficher une seule publication
app.get('/post/:id', verifyToken, async(req,res) =>{
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({message: 'connectez-vous'});
    }
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({message: 'Post non trouvé'});
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

// Route pour gérer l'affichage des forums dans le frontend

app.get('/rooms', verifyToken, async(req,res) =>{
    try {
        const room = await Room.find().sort({createdAt: -1});
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

// Route pour afficher une salon de discussion
app.get('/room/:id', verifyToken, async(req,res) =>{
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({message: 'connectez-vous'});
    }
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({message: 'Room non trouvé'});
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})
// CREATE ROOM
app.post('/room/create', verifyToken, async (req, res) => {
    try {
        const { name, roomPP, bio, members } = req.body;
        const authorId = req.user.userId;

        const author = await User.findById(authorId);

        if (!author) {
            return res.status(400).json({ message: "Utilisateur introuvable" });
        }

        if (!name || !bio || !roomPP) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires." });
        }

        const newRoom = new Room({
            name,
            roomPP,
            bio,
            createdAt: new Date().toISOString(),

            owner: {
                userId: author._id,
                username: author.username,
                userPP: author.userPP
            },
            members

        });

        await newRoom.save();
        res.status(201).json({ message: "Forum créé avec succès", room: newRoom });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur" });
    }
});


// ➜ POST /api/room-content/create
app.post("/room/post", verifyToken, async (req, res) => {

    try {
        const {userId, content, roomId} = req.body;
        const createdAt = new Date();
        const user = await User.findById(userId);

        if (!user) {
             return res.status(400).json({ message: "Utilisateur introuvable" });
        }

        if (!roomId ||!content) {
            return res.status(400).json({ message: "Champs manquants" });
        }
        const newContent = new RoomContent({
            roomId,
            content,
            sender: {
                userId: userId,
                username: user.username,
                userPP: user.userPP
            },
            createdAt,
        });

        await newContent.save();
        res.status(201).json({ message: "Publication ajoutée", newMessage: newContent });

    } catch (error) {
        console.error("Erreur création contenu de forum:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// Ajoute une Membre dans un Room

app.put("/room/join", verifyToken, async(req, res)=>{
    const {roomId, userId} = req.body;

    const room = await Room.findById(roomId);
    const user = await User.findById(userId);
    if (!room) {
        return res.status(400).json({message: "Cette salle est introuvable"})
    }
    if (!user) {
        return res.status(400).json({message: "Utilisateur introuvable"})
    }


    if (room.members.includes(userId)) {
        room.members.pull(userId);
    }else{
        room.members.push(userId);
    }
    
    room.save();
    res.json({message: `Vous avez rejoin ${room.name}`})
})
// Route pour afficher un seul salon 
app.get('/room/:id', verifyToken, async(req,res) =>{
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({message: 'connectez-vous'});
    }
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({message: 'Forum non trouvé'});
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

server.listen(port, ()=>{
    console.log('Serveur lancé sur le port ', port);
});