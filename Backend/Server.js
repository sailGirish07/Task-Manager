// Load environment variables
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Check if we're running in a serverless environment
const isServerless = process.env.SERVERLESS === 'true';

let http;
let server;

if (!isServerless) {
  http = require("http");
  server = http.createServer();
}

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

//Connect Database
connectDB();

//Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Error handling middleware - place this after routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export the app instance for Vercel
module.exports = app;

// Export io for compatibility but set to null in serverless
module.exports.io = null;

// Only start the server if not in serverless environment
if (!isServerless) {
  const PORT = process.env.PORT || 5000;
  server.on('request', app);
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// For serverless environments, set io to null
// const messageController = require('./controllers/messageController');
// messageController.setIo(null);