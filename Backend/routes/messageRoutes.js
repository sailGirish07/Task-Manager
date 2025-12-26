const express = require("express");
const { 
  sendDirectMessage,
  sendGroupMessage,
  getDirectMessages,
  getGroupMessages,
  getUserConversations,
  getUserGroupConversations,
  getUserGroups,
  createGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  deleteMessage,
  markMessagesAsRead,
  updateMessageStatus
} = require("../controllers/messageController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Direct messaging routes
router.post("/direct", protect, sendDirectMessage); // Send direct message
router.get("/direct/:userId", protect, getDirectMessages); // Get direct messages with a user
router.put("/direct/read", protect, markMessagesAsRead); // Mark direct messages as read
router.put("/direct/delivered", protect, updateMessageStatus); // Update status to delivered

// Group messaging routes
router.post("/group", protect, sendGroupMessage); // Send group message
router.get("/group/:groupId", protect, getGroupMessages); // Get group messages
router.get("/groups", protect, getUserGroups); // Get user's groups
router.post("/groups", protect, createGroup); // Create a new group
router.put("/groups/:groupId/members/:userId", protect, addMemberToGroup); // Add member to group
router.delete("/groups/:groupId/members/:userId", protect, removeMemberFromGroup); // Remove member from group
router.delete("/:messageId", protect, deleteMessage); // Delete a message

// Conversations
router.get("/conversations", protect, getUserConversations); // Get user's conversations
router.get("/group-conversations", protect, getUserGroupConversations); // Get user's group conversations

module.exports = router;