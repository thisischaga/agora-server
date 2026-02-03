const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('./Congfig/db');
const verifyToken = require('./Middlewares/verifyTokens');
const Post = require('./Models/Post');
const multer = require('multer');
const http = require('http');
const axios = require('axios');
const RoomContent = require('./Models/RoomContent');
const Room = require('./Models/Room');
const { initSocket } = require('./socket');
const cryptoJS = require('crypto-js');
const Notifications = require('./Models/Notifications');
const Message = require('./Models/Message');

require('dotenv').config();
connectDB();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://agora-front.netlify.app",
    "https://agora-seven-gold.vercel.app"
  ],
  credentials: true
}));

const server = http.createServer(app);
initSocket(server);
const port = 8000;

app.use(express.json({ limit: '20mb' }));

app.post('/signup', async (req, res) => {
    const { username, userPassword, userEmail, userPP, userBirthday } = req.body;
    const createdAt = new Date();

    const emailRegex = /[^\s@]+[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,14}$/;
    const mdpValide = userPassword && userPassword.length >= 6;

    try {
        // 1. Vérification des champs obligatoires
        if (!username || !userPassword || !userEmail || !userBirthday) {
            return res.status(400).json({ message: "Champs manquants" });
        }

        // 2. LOGIQUE DE VÉRIFICATION D'ÂGE (Intégration)
        const today = new Date();
        const birthDate = new Date(userBirthday);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        
        // Ajustement si l'anniversaire n'est pas encore passé cette année
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 15) {
            return res.status(400).json({ 
                message: "Vous devez avoir au moins 15 ans pour vous inscrire." 
            });
        }

        // 3. Validation du format de l'Email
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({ message: "Email invalide" });
        }

        // 4. Vérification si l'utilisateur existe déjà
        const existingUser = await User.findOne({ userEmail });
        if (existingUser) {
            return res.status(400).json({ message: "L'email est déjà utilisé" });
        }

        // 5. Validation du mot de passe
        if (!mdpValide) {
            return res.status(400).json({ message: "Mot de passe trop court (6 caractères min)" });
        }

        // 6. Validation du format du pseudo
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ message: "Format du nom d'utilisateur invalide" });
        }

        // 7. Hashage et création de l'utilisateur
        const hashedPassword = await bcrypt.hash(userPassword, 10);
        const newUser = new User({
            username,
            userPassword: hashedPassword,
            userBirthday,
            userEmail,
            userPP,
            socketId: null,
            messages: [],
            amis: [],
            createdAt
        });

        await newUser.save();

        // 8. Génération du Token
        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ message: 'Profil créé avec succès', token });

    } catch (error) {
        console.error('Erreur du serveur:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

app.post('/login', async (req, res) => {
    const { userEmail, userPassword } = req.body;

    try {
        if (!userEmail || !userPassword) {
            return res.status(404).json({ message: "Champ manquant " })
        }
        const user = await User.findOne({ userEmail });
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé ! " })
        }
        const isMatch = await bcrypt.compare(userPassword, user.userPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }

        )
        res.status(200).json({ message: 'connexion réussie', token });
        console.log('Un compte connecté ', userEmail)


    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' });
        console.log('Erreur', error)
    }

});

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

app.put('/follow', verifyToken, async (req, res) => {
    try {
        const { authorId } = req.body;

        const followerId = req.user.userId
        const createdAt = new Date().toISOString();

        const userFollowing = await User.findById(followerId);
        const author = await User.findById(authorId);

        if (!userFollowing || !author) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        if (author.followers.includes(followerId)) {
            author.followers.pull(followerId);
            userFollowing.following.pull(authorId);
        } else {
            author.followers.push(followerId);
            userFollowing.following.push(authorId);
        }

        await author.save();
        await userFollowing.save();
        const following = userFollowing.following
        const authorFollowers = author.followers
        res.status(201).json({ 'authorFollowers': authorFollowers, 'userFollowings': following })

    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.put('/back_follow', verifyToken, async (req, res) => {
    try {
        const { authorId } = req.body;

        const followerId = req.user.userId
        const createdAt = new Date().toISOString();

        const userFollowing = await User.findById(followerId);
        const author = await User.findById(authorId);

        if (!userFollowing || !author) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        if (userFollowing.followers.includes(authorId)) {

            author.followers.pull(followerId);
            userFollowing.followers.pull(authorId);

            author.following.pull(followerId);
            userFollowing.following.pull(authorId);

            author.amis.push(followerId);
            userFollowing.amis.push(authorId);
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
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.put('/add_following', verifyToken, async (req, res) => {
    try {
        const { userId } = req.body;
        const followerId = req.user.userId
        const user = await User.findById(followerId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        else if (user.following.includes(userId)) {
            user.following.pull(userId)
            res.status(200).json({ message: 'retiré', retired: true })
        }
        else {
            user.following.push(userId);
            res.status(200).json({ message: 'suivi', followed: true })
        }
        await user.save();

    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.get('/amis/followers', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const followers = user.followers;
        const followersData = await Promise.all(followers.map(async (followerId) => {
            const followerUser = await User.findById(followerId);
            if (!followerUser) return null
            return {
                id: followerUser._id.toString(),
                username: followerUser.username,
                pp: followerUser.userPP
            }
        }));

        const cleanFollowers = followersData.filter(f => f !== null)
        res.json(cleanFollowers);

    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.get('/followers', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const followers = user.followers
        res.json(followers)
    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

// All users
app.get('/all-users', verifyToken, async (req, res) => {

    const userId = req.user.userId
    try {
        const users = await User.find({_id: {$ne: userId}}).sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});

// A user profile
app.get('/user/:id', verifyToken, async (req, res) => {

    const userId = req.params.id
    try {
        const user = await User.findById(userId);
        const userPosts = await Post.find({ userId: userId });

        if (!user) {
            return res.status(401).json({ message: "Utilisateur non trouvé" });
        }

        res.json({
            userId: user._id,
            username: user.username,
            userPP: user.userPP,
            followers: user.followers,
            following: user.following,
            amis: user.amis,
            createdAt: user.createdAt,
            socketId: user.socketId,
            posts: userPosts,
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});

app.get('/following', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const following = user.following
        res.json(following)
    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.get('/amis/following', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const following = user.following;

        const followingsData = await Promise.all(following.map(async (followerId) => {
            const followingUser = await User.findById(followerId);
            if (!followingUser) return null;
            return {
                id: followingUser._id.toString(),
                username: followingUser.username,
                pp: followingUser.userPP
            }
        }));

        const cleanFollowings = followingsData.filter(f => f !== null)
        res.json(cleanFollowings);

    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.get('/amis', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const amis = user.amis
        res.json(amis)
    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.get('/amis/all_friends', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'Utilisateur non trouvé' })
        }
        const amis = user.amis;
        const amisData = await Promise.all(amis.map(async (ami) => {
            const friendUser = await User.findById(ami);
            if (!friendUser) return null
            return {
                id: friendUser._id.toString(),
                username: friendUser.username,
                pp: friendUser.userPP
            }
        }));

        const cleanFollowers = amisData.filter(a => a !== null)
        res.json(cleanFollowers);

    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur' })
        console.log('Erreur: ', error)
    }
});

app.get('/user_data', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const userPosts = await Post.find({ userId: req.user.userId });
        const favorisPosts = await Post.find({ favoris: req.user.userId });

        if (!user) {
            return res.status(401).json({ message: "Utilisateur non trouvé" });
        }
        return res.status(200).json({
            userId: user._id,
            notifications: user.notifications,
            followers: user.followers,
            following: user.following,
            amis: user.amis,
            username: user.username,
            userPP: user.userPP,
            posts: userPosts,
            favoris: favorisPosts,
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});

app.post('/publication', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const { post } = req.body;

    console.log(post)
    let favoris = [];

    const createdAt = new Date().toISOString();


    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(401).json({ message: "Utilisateur non trouvé" });
        }
        const { username, userPP } = user;
        const newPost = new Post({
            username, userPP, post, userId, createdAt, favoris
        });
        await newPost.save();

        res.status(201).json({ message: "publié", })
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }

});

app.put('/post/like', verifyToken, async (req, res) => {

    const { postId, authorId } = req.body;
    const viewerId = req.user.userId;
    const createdAt = new Date().toISOString();

    try {
        const post = await Post.findById(postId);
        const author = await User.findById(authorId);
        const user = await User.findById(viewerId);

        if (!post) {
            return res.status(404).json({ message: 'post non trouvé !' })
        }
        if (!author) {
            return res.status(404).json({ message: 'Utilisateur non trouvé !' })
        }
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé !' })
        }
        if (post.postLike.includes(viewerId)) {
            post.postLike.pull(viewerId);
        } else {
            post.postLike.push(viewerId);

        }
        await post.save();
        const likes = post.postLike;
        res.status(200).json({ 'likes': likes, })
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

app.put('/post/comment', verifyToken, async (req, res) => {
    const { commentary, currentPostId, userId, authorId } = req.body
    const createdAt = new Date().toISOString();
    const author = await User.findById(authorId);
    const user = await User.findById(userId);
    try {
        const post = await Post.findById(currentPostId);
        if (!post) {
            return res.status(404).json({ message: "Post non trouvé !" })
        }
        if (!author) {
            return res.status(404).json({ message: 'Utilisateur non trouvé !' })
        }
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé !' })
        }
        const { username, userPP } = user;
        post.postComment.push({
            userId, username, userPP, commentary, createdAt
        });

        await post.save();
        await author.save();

        const commentaires = post.postComment;
        return res.status(200).json({ message: "Vous avez commenté ce post !", 'commentaires': commentaires })



    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});

app.put('/post/sharing', verifyToken, async (req, res) => {
    const { currentPostId, userId } = req.body
    try {
        const post = await Post.findById(currentPostId);
        if (!post) {
            return res.status(404).json({ message: "Post non trouvé !" })
        }
        else if (!post.sharing.includes(userId)) {
            post.sharing.push(userId);
        }

        await post.save();
        const sharing = post.sharing;
        return res.status(200).json({ message: "Vous avez partagé ce post !", 'sharing': sharing })


    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});

app.put('/post/favoris', verifyToken, async (req, res) => {

    const { postId, authorId } = req.body;
    const viewerId = req.user.userId;

    try {
        const post = await Post.findById(postId);
        const author = await User.findById(authorId);
        const user = await User.findById(viewerId);

        if (!post) {
            return res.status(404).json({ message: 'post non trouvé !' })
        }
        if (!author) {
            return res.status(404).json({ message: 'Utilisateur non trouvé !' })
        }
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé !' })
        }
        if (post.favoris.includes(viewerId)) {
            post.favoris.pull(viewerId);

        } else {
            post.favoris.push(viewerId);
        }
        await post.save();
        const favoris = post.favoris;
        res.status(200).json({ 'favoris': favoris, })
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

app.get('/posts', verifyToken, async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

app.get('/post/:id', verifyToken, async (req, res) => {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ message: 'connectez-vous' });
    }
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post non trouvé' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

app.get('/rooms', verifyToken, async (req, res) => {
    try {
        const room = await Room.find().sort({ createdAt: -1 });
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

app.get('/room/:id', verifyToken, async (req, res) => {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ message: 'connectez-vous' });
    }
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room non trouvé' });
        }
        if (!room.members.includes(userId)) {
            return res.status(403).json({ message: 'Accès refusé. Vous n\'êtes pas membre de ce forum.' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

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
        const secretKey = cryptoJS.lib.WordArray
            .random(32)
            .toString(cryptoJS.enc.Base64);

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
            members,
            secretKey

        });

        await newRoom.save();
        res.status(201).json({ message: "Forum créé avec succès", room: newRoom });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.post("/room/post", verifyToken, async (req, res) => {

    try {
        const { userId, content, roomId, image } = req.body;
        const createdAt = new Date();
        const user = await User.findById(userId);

        console.log(image, content)
        if (!user) {
            return res.status(400).json({ message: "Utilisateur introuvable" });
        }

        if (!roomId || !content) {
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
            image,
            createdAt,
        });

        await newContent.save();
        res.status(201).json({ message: "Publication ajoutée", newMessage: newContent, roomId: newContent.roomId });

    } catch (error) {
        console.error("Erreur création contenu de forum:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.put("/room/join", verifyToken, async (req, res) => {
    const { roomId, userId } = req.body;

    const room = await Room.findById(roomId);
    const user = await User.findById(userId);
    if (!room) {
        return res.status(400).json({ message: "Cette salle est introuvable" })
    }
    if (!user) {
        return res.status(400).json({ message: "Utilisateur introuvable" })
    }


    if (room.members.includes(userId)) {
        room.members.pull(userId);
    } else {
        room.members.push(userId);
    }

    room.save();
    res.json({ message: `Vous avez rejoin ${room.name}` })
})

app.get('/user/notifs/:userId', verifyToken, async (req, res) => {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ message: 'connectez-vous' });
    }
    try {
        const notifs = await Notifications.find({ to: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(notifs);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
})

app.post("/notif/create", verifyToken, async (req, res) => {

    try {
        const { userId, to, message, type, post } = req.body;
        const createdAt = new Date();
        const user = await User.findById(userId);
        let isRead = false;

        if (!user) {
            return res.status(400).json({ message: "Utilisateur introuvable" });
        }
        const { username, userPP } = user

        const newNotif = new Notifications({
            userId,
            message,
            to,
            username,
            userPP,
            isRead,
            notifType: type,
            post,
            createdAt,
        });

        await newNotif.save();
        res.status(201).json({ message: "Notification envoyée", newNotif: newNotif, });

    } catch (error) {
        console.error("Erreur création notifs:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.put("/notifications/read-all", verifyToken, async (req, res) => {
    const { notifications } = req.body;

    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(400).json({ message: "Utilisateur introuvable" })
    }
    notifications.map(async (notif) => {
        const notification = await Notifications.findById(notif._id);
        if (!notification) {
            return res.status(400).json({ message: "Notification introuvable" })
        }

        Notifications.updateOne({ _id: notif._id }, { view: true });
        await notification.save();
        console.log(notification)

    })

})

app.put("/notifications/read", verifyToken, async (req, res) => {
    const { notifId } = req.body;

    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(400).json({ message: "Utilisateur introuvable" })
    }
    const notification = await Notifications.findByIdAndUpdate({ _id: notifId }, { isRead: true });
    if (!notification) {
        return res.status(400).json({ message: "Notification introuvable" })
    }

    await notification.save();

})

app.put("/notifications/read-all", verifyToken, async (req, res) => {
    const { notifications } = req.body;

    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(400).json({ message: "Utilisateur introuvable" })
    }
    notifications.map(async (notif) => {
        const notification = await Notifications.findById(notif._id);
        if (!notification) {
            return res.status(400).json({ message: "Notification introuvable" })
        }

        Notifications.updateOne({ _id: notif._id }, { view: true });
        await notification.save();
        console.log(notification)

    })

})

app.put("/message/read", verifyToken, async (req, res) => {
    const { messageId } = req.body;

    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(400).json({ message: "Utilisateur introuvable" })
    }
    const message = await Message.findByIdAndUpdate({ _id: messageId }, { isRead: true });
    if (!message) {
        return res.status(400).json({ message: "Message introuvable" })
    }

    await message.save();
    console.log(mess)

})

app.get('/conversations/:otherId', verifyToken, async (req, res) => {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ message: 'connectez-vous' });
    }
    try {
        const messages = await Message.find({ participants: {$all: [req.params.otherId, userId]} })
            .sort({ createdAt: 1 })
            .limit(20);

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Erreur interne du serveur" });
        console.log('Erreur:', error);
    }
});

app.get("/conversations_list", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId.toString();

        const conversations = await Message.aggregate([
            // 1️⃣ messages où l'utilisateur est participant
            {
                $match: {
                    participants: { $in: [userId] }
                }
            },

            // 2️⃣ dernier message en premier
            {
                $sort: { createdAt: -1 }
            },

            // 3️⃣ grouper par "autre utilisateur"
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$senderId", userId] },
                            "$receiverId",
                            "$senderId"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            },

            // 4️⃣ convertir l'id string → ObjectId
            {
                $addFields: {
                    otherUserId: { $toObjectId: "$_id" }
                }
            },

            // 5️⃣ récupérer les infos utilisateur
            {
                $lookup: {
                    from: "users",
                    localField: "otherUserId",
                    foreignField: "_id",
                    as: "userData"
                }
            },

            // 6️⃣ nettoyer
            { $unwind: "$userData" },

            // 7️⃣ format final côté backend
            {
                $project: {
                    _id: 0,
                    conversationWith: {
                        id: "$userData._id",
                        username: "$userData.username",
                        userPP: "$userData.userPP",
                        socketId: "$userData.socketId"
                    },
                    lastMessage: {
                        id: "$lastMessage._id",
                        text: "$lastMessage.message",
                        createdAt: "$lastMessage.createdAt",
                        unread: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$lastMessage.receiverId", userId] },
                                        { $eq: ["$lastMessage.isRead", false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        res.status(200).json(conversations);

    } catch (error) {
        console.error("❌ conversations_list error:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});


// Send message

app.post("/messages/send", verifyToken, async (req, res) => {

    try {
        const { participants, text, receiverId } = req.body;

        const userId = req.user.userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ message: "Utilisateur introuvable" });
        }

        if (!participants || !text || !receiverId) {
            return res.status(400).json({ message: "Champs manquants" });
        }
        const newContent = new Message({
            receiverId,
            senderId: userId,
            participants,
            message: text,
        });

        await newContent.save();
        res.status(201).json({ newMessage: newContent });

    } catch (error) {
        console.error("Erreur d'envoi de message:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

server.listen(port, () => {
    console.log(`Le serveur est démarré sur le port ${port}`);
});
