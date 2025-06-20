import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import userRoutes from './routes/users.routes.js'


// for socket
import {createServer} from 'node:http'
import {Server} from 'socket.io'
import {connectToSocket} from './controllers/socketManeger.js'


const app = express()

// Create an HTTP server and attach Express app
const server = createServer(app)
// Attach Socket.io to the HTTP server
const io = connectToSocket(server)


app.use(cors())
app.set('PORT',(process.env.PORT || 8000))
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}));

app.use('/api/v1/users',userRoutes)



app.get('/', (req,res)=>{
    return res.json({"name" : "omkar"})
})

server.listen(app.get("PORT"),async()=>{
    const connectionDB =await mongoose.connect('mongodb+srv://omalbhare:zoom3964@cluster0.o9lk0se.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    console.log(`${connectionDB.connection.host}`)
    console.log(`server is listenig on port :${app.get("PORT")} `)
})
