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

        const authUserId = socket.handshake.auth.userId;
        socket.join(authUserId);

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

        socket.on('newMsgAlert', (data)=>{
            console.log(data)
            socket.emit('newMess', data)
            
        })
    
        socket.on('sendMessage', async(data)=>{
            const participants = data.backendData.participants;
            const receiverId = data.backendData.receiverId;
            const text = data.backendData.text;

            const backendURL = data.metaData.backendUrl;
            const token = data.metaData.token;

            //const optimisticMsg = data.optimisticMsg;


            try {

                const response = await axios.post(`${backendURL}/messages/send`, {
                    participants: participants,
                    receiverId: receiverId,
                    text: text
                }, {
                    headers: { Authorization: `Bearer${token}` }
                });
                const optimisticMsg = response.data;

                io.to(receiverId).emit('newMsg', optimisticMsg)
            } catch (error) {
                console.log("Erreur", "L'envoi a échoué.", error);
            }
    
        });
        socket.on('message:read', async(data)=>{
            try {
                await axios.put(`${data.API_URL}/messages/read`, {
                    ortherId: data.ortherId
                }, {
                    headers: { Authorization: `Bearer${data.token}` }
                });
            } catch (error) {
                console.log('Erreur', error)
            }
        });
        socket.on('message', (data)=>{
            const receiverId = data.receiverId;
            io.to(receiverId).emit('message', {notif: 'New message'})
        })
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