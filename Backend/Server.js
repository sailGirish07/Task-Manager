// Load environment variables conditionally
if (!process.env.VERCEL_ENV) {
  require("dotenv").config();
}
const express = require("express");
const cors = require("cors");
const path = require("path");

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

// Connect to database when the app is first used
app.use(async (req, res, next) => {
  // Only connect to database if not already connected
  if (global.dbConnected !== true) {
    try {
      const connectDB = require("./config/db.js");
      await connectDB();
      global.dbConnected = true;
    } catch (error) {
      console.error('Database connection error:', error);
      // Continue anyway, since this might be a health check
    }
  }
  next();
});

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
app.use('/api/messages', messageRoutes);

// Error handling middleware - place this after routes
// Catch-all for API routes that weren't found
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export the app instance for Vercel
module.exports = app;

