const express = require("express");
const {adminOnly, protect} = require("../middlewares/authMiddleware");
const { getUser, getUserById, deleteUser } = require("../controllers/userController");

const router = express.Router()

//User Man. routes
router.get("/", protect, adminOnly, getUser); //All Users
router.get("/:id", protect, getUserById); 
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;