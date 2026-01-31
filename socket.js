const axios = require('axios');
const {Server} = require ('socket.io');

let io;
const connectedUsers = new Map();

const initSocket = (server)=>{
    io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
            methods: ['GET', 'POST'],
        }
    });

    io.on('connection', (socket)=>{
        
        const userId = socket.handshake.query.t
        connectedUsers.set(socket.id, userId)
        console.log('Utilisateur conneté...', socket.id);
        console.log("Nombre d'utilisateurs connetés...',", connectedUsers.size);
    
        socket.on("newUser", (data)=>{
            if (data) {
                socket.broadcast.emit("newUser", message= `${data} a rejoint le chat`);
            }
        })
        socket.on("quitRoom", (data)=>{
            if (data) {
                socket.broadcast.emit("quitRoom", message= `${data} a quitté le chat`);
            }
        })
    
        socket.on('sendMessage', async(data)=>{

            try {
                const response = await axios.post('http://localhost:8000/room/post', {
                        userId: data.userId,
                        content: data.content,
                        roomId: data.roomId}, 
                        {headers: {Authorization: `Bearer${data.token}`}
            })
                
            socket.emit('newMessage', response.data.newMessage);
            socket.broadcast.emit("newMessageAll", response.data.newMessage);
            } catch (error) {
                console.log('Erreur', error);
            }; 
    
        });
        socket.on('notif', async(data)=>{
            console.log(data)
            try {
                const response = await axios.post('http://localhost:8000/notif/create',
                    {
                        userId: data.userId,
                        to: data.authorId,
                        message: data.message,
                        post: data.post,
                        type: data.type
                    }, {headers: {Authorization: `Bearer${data.token}`}}
                )
            } catch (error) {
                console.log('Erreur', error);
            };
        });
    
        socket.on('disconnect', async()=>{
            try {
                await axios.post('http://localhost:8000/socket/disconnect/getSocketId', {socketId: socket.id}, {
                })
                
            } catch (error) {
                console.log('Erreur', error);
            };
            connectedUsers.delete(socket.id);
            console.log("Un utilisateur s'est deconnecté", socket.id);
            console.log("Nombre d'utilisateurs connetés...',", connectedUsers.size);
        });
    
    })
}

module.exports = {initSocket};