// Load environment variables
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db.js");

const authRoutes = require("./routes/authRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const taskRoutes = require("./routes/taskRoutes.js");
const reportRoutes = require("./routes/reportRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");

const app = express();

// Apply middleware to the app
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to database
connectDB();

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.sendStatus(204); // No content
});

//Routes
app.use("/api/auth", authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Initialize message controller with null io for non-socket environments
const messageController = require('./controllers/messageController');

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize message controller with io instance
messageController.setIo(io);

app.use('/api/messages', messageRoutes);

// Export the app instance
module.exports = app;

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join user room
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.broadcast.to(data.recipientId).emit('typing', data);
  });

  // Handle message read receipts
  socket.on('messageRead', (data) => {
    socket.broadcast.to(data.senderId).emit('messageRead', data);
  });

  // Handle profile updates
  socket.on('profileUpdate', (data) => {
    socket.broadcast.emit('profileUpdated', data);
  });

  socket.on('disconnect', () => {
    // User disconnected
  });
});
