import nextConnect from 'next-connect';
import Cors from 'cors';
import connectDB from '../config/db';

// Initialize CORS middleware
const cors = Cors({
  origin: process.env.CLIENT_URL || '*', // Allow all origins or use environment variable
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Helper method to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Create the Next.js API handler with next-connect
const handler = nextConnect();

// Connect to database
connectDB();

// Add CORS middleware
handler.use(async (req, res, next) => {
  await runMiddleware(req, res, cors);
  next();
});

// Import your routes
import authRoutes from '../routes/authRoutes';
import userRoutes from '../routes/userRoutes';
import taskRoutes from '../routes/taskRoutes';
import reportRoutes from '../routes/reportRoutes';
import notificationRoutes from '../routes/notificationRoutes';
import messageRoutes from '../routes/messageRoutes';

// Add your routes to the handler
handler.use('/api/auth*', authRoutes);
handler.use('/api/users*', userRoutes);
handler.use('/api/tasks*', taskRoutes);
handler.use('/api/reports*', reportRoutes);
handler.use('/api/notifications*', notificationRoutes);
handler.use('/api/messages*', messageRoutes);

// Default handler for root
handler.get('/', (req, res) => {
  res.status(200).json({ message: 'Task Manager API is running!' });
});

// 404 handler
handler.all((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default handler;

export const config = {
  api: {
    bodyParser: false,
  },
};