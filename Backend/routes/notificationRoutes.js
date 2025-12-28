const express = require("express");
const { 
  getNotifications, 
  markAsRead, 
  deleteNotification
} = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Notification Routes
router.get("/", protect, getNotifications); // Get all notifications for user
router.put("/:id/read", protect, markAsRead); // Mark a notification as read
router.delete("/:id", protect, deleteNotification); // Delete a notification

module.exports = router;