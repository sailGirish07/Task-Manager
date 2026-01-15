// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require("dotenv").config();
}
// In production, Vercel automatically injects environment variables
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
// // const socketIo = require("socket.io"); // Disabled for Vercel deployment // Disabled for Vercel deployment
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

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204); // No content
});

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204); // No content
});

//Routes
app.use("/api/auth", authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Catch-all route for undefined endpoints (after API routes)
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Socket.io disabled for Vercel deployment
// const io = socketIo(server, {
//   cors: {
//     origin: process.env.CLIENT_URL || "http://localhost:5173",
//     methods: ["GET", "POST"],
//     credentials: true
//   }
// });

// Track online users (mock for compatibility)
// const onlineUsers = new Map();

// io.on('connection', (socket) => {
//   // All Socket.io handlers disabled for Vercel
// });

const io = null; // Mock io for compatibility

// Export mock io instance for controllers
module.exports.io = io;

// Skip Socket.io setup for Vercel deployment
// const messageController = require('./controllers/messageController');
// messageController.setIo(io);

//Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
