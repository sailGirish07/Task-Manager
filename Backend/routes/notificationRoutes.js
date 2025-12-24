const express = require("express");
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  deleteAllNotifications 
} = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Notification Routes
router.get("/", protect, getNotifications); // Get all notifications for user
router.put("/:id/read", protect, markAsRead); // Mark a notification as read
router.put("/all/read", protect, markAllAsRead); // Mark all notifications as read
router.delete("/:id", protect, deleteNotification); // Delete a notification
router.delete("/all", protect, deleteAllNotifications); // Delete all notifications

module.exports = router;