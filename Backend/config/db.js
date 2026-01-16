const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // In serverless environments, reuse connection if available
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected");
    }
    return mongoose.connection;
  } catch (err) {
    console.error("Error connecting to mongodb", err);
    // Don't exit in serverless environment - let the function complete
    throw err;
  }
};


module.exports = connectDB;