const express = require("express");
const {adminOnly, protect} = require("../middlewares/authMiddleware");
const { getUser, getUserById, deleteUser, getAllUsersForMessaging, getOnlineUsers } = require("../controllers/userController");

const router = express.Router()

//User Man. routes
router.get("/", protect, adminOnly, getUser); //All Users (Admin only)
router.get("/messaging/all", protect, getAllUsersForMessaging); //All users for messaging (All authenticated users)
router.get("/online-status", protect, getOnlineUsers); //Get online users (All authenticated users)
router.get("/:id", protect, getUserById); 
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;