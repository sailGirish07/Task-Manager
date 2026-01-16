const express = require("express");
const {registerUser, loginUser, getUserProfile, updateUserProfile, verifyCode, resendVerificationEmail, verifyLoginCode, forgotPassword, resetPassword, verifyPasswordResetCode, refreshAccessToken} = require('../controllers/authController')
const {protect} = require('../middlewares/authMiddleware')
const { imageUpload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Auth Routes:
router.post("/register", registerUser); // Register User
router.post("/login", loginUser); // Login User
router.post("/verify-login-code", verifyLoginCode); // Verify Login Code and Generate Token
router.post("/verify-code", verifyCode); // Verify Email with Code
router.post("/resend-code", resendVerificationEmail); // Resend Verification Code
router.post("/verify-password-reset-code", verifyPasswordResetCode); // Verify Password Reset Code
router.post("/refresh-token", refreshAccessToken); // Refresh Access Token
router.get("/profile", protect, getUserProfile); // Get User Profile
router.put("/profile", protect, updateUserProfile); // Update Profile
router.post("/forgot-password", forgotPassword); // Request password reset
router.post("/reset-password", resetPassword); // Reset password with token

router.post("/upload-image", imageUpload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;

  res.status(200).json({ imageUrl });
});

module.exports = router;
