const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Error connecting to mongodb", err);
    // Don't exit in serverless environment - let the function complete
    throw err;
  }
};


module.exports = connectDB;