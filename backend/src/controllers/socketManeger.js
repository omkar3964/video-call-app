// import { Server } from "socket.io";

// const connectToSocket = (server)=>{
//     const io = new Server(server)
//     return io
// }
// export default connectToSocket
// above code is basics for socket  in these we need to handel different event like join chat disconnection


import { Server } from "socket.io";

let connections ={}
let messages = {}
let timeOnline= {}

export const connectToSocket = (server)=>{
    const io =  new Server(server,{
        cors:{
            origin:["*"],
            methods:["GET","POST"],
            allowedHeaders:["*"],
            credentials:true
        }
    })
    
    io.on("connection",(socket)=>{  //io.on is used to listen client side event
        // console.log("hi somewas try to connect", socket.id)
        socket.on("join-call", (path)=>{
            if(connections[path] === undefined){//If it's a new room (not in connections yet), it creates an empty list for that room.
                connections[path] = []
            }
            // connections[path].push(socket.id)
            // timeOnline[socket.id] = new Date()
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id)
                timeOnline[socket.id] = new Date()
            }
            // console.log(connections)

            for(let a = 0; a < connections[path].length ; a++){
                io.to(connections[path][a]).emit("user-joined", socket.id,connections[path])//notified each user ,the new user is join with socket.id
            }

            if(messages[path] !== undefined){
                for(let a=0 ; a < messages[path].length ; a++){
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'], 
                        messages[path][a]['sender'],messages[path][a]['socket-id-sender']
                    )
                }
                 
            }
        })


        socket.on("signal", (toId, message)=>{ //Listen for client event	socket.on("event-name", handler)
            io.to(toId).emit("signal", socket.id, message);
        })


        socket.on("chat-message", (data, sender)=>{
            const [matchingRoom, found] = Object.entries(connections)
            .reduce(([room , isFound], [roomKey, roomValue]) =>{

                if(!isFound && roomValue.includes(socket.id)){
                    return [roomKey, true]
                }
                return [room, isFound]
            }, ['', false])

            if(found ===true){
                if(messages[matchingRoom] === undefined){
                    messages[matchingRoom] = []
                }
                messages[matchingRoom].push({'sender':sender, 'data':data , 'socket-id-sender':socket.id})
                // console.log('messages',matchingRoom , ":", sender, data);
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit('chat-message', data, sender, socket.id)
                });
                
            }

        })


        socket.on("disconnect", ( )=>{
            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key 
                //[room, person]
            for(const [k,v] of JSON.parse(JSON.stringify(Object.entries(connections)))){
                for(let a = 0 ; a < v.length ; a++){
                    if(v[a] === socket.id){
                        key = k

                        for(let a=0 ; a<connections[key].length ; a++){
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1)

                        if(connections[key].length === 0){
                            delete connections[key]
                        }
                    }


                }
            }

        })
    })
    return io
}
