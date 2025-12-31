require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const connectDB = require("./config/db.js");

const authRoutes = require("./routes/authRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const taskRoutes = require("./routes/taskRoutes.js");
const reportRoutes = require("./routes/reportRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//Connect Database
connectDB();

//Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Routes
app.use("/api/auth", authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

//Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // console.log('A user connected:', socket.id);
  
  // User joins with their ID when they connect
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    // console.log(`User ${userId} joined with socket ID ${socket.id}`);
    
    // Update online status in database
    // This would require importing User model and updating lastActive
  });
  
  // Handle new messages
  socket.on('newMessage', (data) => {
    // Broadcast the message to the recipient if they're online
    if (data.recipientId && onlineUsers.has(data.recipientId)) {
      io.to(onlineUsers.get(data.recipientId)).emit('newMessage', data);
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    if (data.recipientId && onlineUsers.has(data.recipientId)) {
      io.to(onlineUsers.get(data.recipientId)).emit('typing', {
        senderId: data.senderId,
        isTyping: data.isTyping
      });
    }
  });
  
  // Handle read receipts
  socket.on('messageRead', (data) => {
    if (data.senderId && onlineUsers.has(data.senderId)) {
      io.to(onlineUsers.get(data.senderId)).emit('messageRead', {
        recipientId: data.recipientId,
        messageId: data.messageId
      });
    }
  });
  
  // Handle profile updates
  socket.on('profileUpdate', (data) => {
    // Broadcast profile update to all connected users except the sender
    socket.broadcast.emit('profileUpdated', data);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    // console.log('A user disconnected:', socket.id);
    // Remove user from online users map
    for (let [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

// Export io instance for controllers
module.exports.io = io;

// Set io instance in message controller
const messageController = require('./controllers/messageController');
messageController.setIo(io);

//Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
