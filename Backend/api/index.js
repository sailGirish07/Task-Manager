const express = require('express');
const cors = require('cors');
const connectDB = require('../config/db');

// Import routes
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const taskRoutes = require('../routes/taskRoutes');
const reportRoutes = require('../routes/reportRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const messageRoutes = require('../routes/messageRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Task Manager API is running!' });
});

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = async (req, res) => {
  // Vercel serverless function wrapper
  await new Promise((resolve, reject) => {
    app(req, res);
    req.res = res; // Attach res to req for proper handling
    resolve();
  });
};