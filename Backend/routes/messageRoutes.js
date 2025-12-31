const express = require("express");
const { 
  sendDirectMessage,
  getDirectMessages,
  getUserConversations,
  deleteMessage,
  markMessagesAsRead,
  updateMessageStatus
} = require("../controllers/messageController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Direct messaging routes
router.post("/direct", protect, upload.single('file'), sendDirectMessage); // Send direct message
router.get("/direct/:userId", protect, getDirectMessages); // Get direct messages with a user
router.put("/direct/read", protect, markMessagesAsRead); // Mark direct messages as read
router.put("/direct/delivered", protect, updateMessageStatus); // Update status to delivered

// Delete a message
router.delete("/:messageId", protect, deleteMessage); // Delete a message

// Conversations
router.get("/conversations", protect, getUserConversations); // Get user's conversations

module.exports = router;