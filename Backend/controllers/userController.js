const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const getUser = async (req, res) => {
  try {
    const users = await User.find({ role: "member" }).select("-password");

    // Process all users with their task counts
    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        // Count tasks for this specific user across all statuses
        const [pendingTasks, inProgressTasks, completedTasks] = await Promise.all([
          Task.countDocuments({ assignedTo: user._id, status: "Pending" }),
          Task.countDocuments({ assignedTo: user._id, status: "In Progress" }),
          Task.countDocuments({ assignedTo: user._id, status: "Completed" })
        ]);

        return {
          ...user._doc, //Includes all existing user data
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      })
    );

    res.json(usersWithTaskCounts);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if(!user) return res.status(404).json({message: "User not found"});
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is admin trying to delete themselves
    if (user.role === "admin" && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get all users for messaging (accessible by all authenticated users)
const getAllUsersForMessaging = async (req, res) => {
  try {
    // Get all users except the current user, select only necessary fields
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("name email profileImageUrl role")
      .sort({ name: 1 });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get online users (active within last 5 minutes)
const getOnlineUsers = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Find users who were active in the last 5 minutes
    const onlineUsers = await User.find({
      lastActive: { $gte: fiveMinutesAgo }
    }).select("_id");

    const onlineUserIds = onlineUsers.map(user => user._id);
    res.json({ onlineUserIds });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = { getUser, getUserById, deleteUser, getAllUsersForMessaging, getOnlineUsers };
