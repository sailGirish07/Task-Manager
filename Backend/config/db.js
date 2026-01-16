const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // In serverless environments, reuse connection if available
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB connected");
    }
  } catch (err) {
    console.error("Error connecting to mongodb", err);
    // Don't exit in serverless environment - let the function complete
    throw err;
  }
};


module.exports = connectDB;