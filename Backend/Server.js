// Load environment variables conditionally
if (process.env.NODE_ENV !== 'production') {
  require("dotenv").config();
}
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");

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
// Catch-all for API routes
app.use(/^\/api\/.*/, (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Export the app instance for Vercel
module.exports = app;

// Only start server locally
if (!process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const server = http.createServer(app);
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}