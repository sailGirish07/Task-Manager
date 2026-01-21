const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { sendVerificationEmail } = require("../utils/emailService");

// Generate Access Token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Generate legacy token for backward compatibility
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, profileImageUrl, adminInviteToken } =
      req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate name length
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
    }

    // Validate password strength
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Validate optional fields
    if (profileImageUrl && typeof profileImageUrl !== "string") {
      return res.status(400).json({ message: "Profile image URL must be a string" });
    }

    if (adminInviteToken && typeof adminInviteToken !== "string") {
      return res.status(400).json({ message: "Admin invite token must be a string" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Determine user role: Admin if correct token is provided, otherwise Member
    let role = "member";
    if (
      adminInviteToken &&
      adminInviteToken === process.env.ADMIN_INVITE_TOKEN
    ) {
      role = "admin";
    }

    //Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // No verification code needed at registration since user can login directly

    //create new user (unverified)
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      profileImageUrl,
      role,
      verified: false  // User is created unverified
    });

    //Return success message - no email verification at registration
    res.status(201).json({
      message: "Registration successful! You can now login.",
      email: email
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Password" });
    }
    
    // Check if user is already verified
    if (user.verified) {
      // User already verified - generate tokens and login
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
      return;
    }
    
    // User not verified - send verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpires = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    
    // Save code to user
    user.verificationCode = verificationCode;
    user.codeExpires = codeExpires;
    await user.save();
    
    // Send verification email with code in the background
    sendVerificationEmail(email, verificationCode)
      .then(emailResult => {
        if (!emailResult.success) {
          console.error('Failed to send verification email:', emailResult.error);
        }
      })
      .catch(emailError => {
        console.error('Error sending verification email:', emailError);
      });
    
    // Return response immediately without waiting for email
    res.status(200).json({
      message: "Verification code sent to your email. Please verify to continue.",
      verificationRequired: true,
      email: email
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    // Validate user ID format
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update name if provided
    if (req.body.name !== undefined) {
      // Validate name
      if (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 50) {
        return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
      }
      user.name = req.body.name.trim();
    }
    
    // Update email if provided
    if (req.body.email !== undefined) {
      // Validate email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Check if email already exists for another user
      const existingUser = await User.findOne({ 
        email: req.body.email.trim().toLowerCase(), 
        _id: { $ne: req.user.id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use by another user" });
      }
      
      user.email = req.body.email.trim().toLowerCase();
    }
    
    // Only update profileImageUrl if it's explicitly provided (including empty string to remove image)
    if (req.body.profileImageUrl !== undefined) {
      if (req.body.profileImageUrl && typeof req.body.profileImageUrl !== "string") {
        return res.status(400).json({ message: "Profile image URL must be a string" });
      }
      user.profileImageUrl = req.body.profileImageUrl;
    }

    if (req.body.password) {
      // Validate password strength
      if (typeof req.body.password !== "string" || req.body.password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImageUrl: updatedUser.profileImageUrl,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify email with code
const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Input validation
    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Validate code format (6-digit number)
    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ message: "Invalid verification code format" });
    }
    
    // ✅ STEP 1: Find user by email ONLY
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !user.verificationCode) {
      return res.status(400).json({
        errorType: "INVALID_CODE",
        message: "Invalid verification code",
      });
    }

    // ✅ STEP 2: Check expiration
    if (user.codeExpires < Date.now()) {
      return res.status(400).json({
        errorType: "CODE_EXPIRED",
        message: "Verification code has expired",
      });
    }

    // ✅ STEP 3: Check code match
    if (user.verificationCode !== code) {
      return res.status(400).json({
        errorType: "INVALID_CODE",
        message: "Invalid verification code",
      });
    }
    
    // Mark user as verified and save verification timestamp
    user.verified = true;
    user.verifiedAt = new Date(); // Save when user verified
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    
    await user.save();
    
    res.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify login code and generate token
const verifyLoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Validate input
    if (!email || !code) {
      return res.status(400).json({ 
        message: "Email and code are required" 
      });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Validate code format (6-digit number)
    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ message: "Invalid verification code format" });
    }
    
    // ✅ STEP 1: Find user by email ONLY
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !user.verificationCode) {
      return res.status(400).json({
        errorType: "INVALID_CODE",
        message: "Invalid verification code",
      });
    }

    // ✅ STEP 2: Check expiration
    if (user.codeExpires < Date.now()) {
      return res.status(400).json({
        errorType: "CODE_EXPIRED",
        message: "Verification code has expired",
      });
    }

    // ✅ STEP 3: Check code match
    if (user.verificationCode !== code) {
      return res.status(400).json({
        errorType: "INVALID_CODE",
        message: "Invalid verification code",
      });
    }
    
    // Mark user as verified and save verification timestamp
    user.verified = true;
    user.verifiedAt = new Date(); // Save when user verified
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    
    await user.save();
    
    // Generate tokens for authenticated user
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    res.json({
      success: true,
      message: "Email verified successfully!",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Input validation
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if already verified
    if (user.verified) {
      return res.status(400).json({ 
        message: "Email already verified. Please login to continue." 
      });
    }
    
    // Generate new verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpires = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    
    // Reset verification status and update code
    user.verified = false;
    user.verifiedAt = null;
    user.verificationCode = verificationCode;
    user.codeExpires = codeExpires;
    
    await user.save();
    
    // Send verification email with code in the background
    sendVerificationEmail(email, verificationCode)
      .then(emailResult => {
        if (!emailResult.success) {
          console.error('Failed to send verification email:', emailResult.error);
        }
      })
      .catch(emailError => {
        console.error('Error sending verification email:', emailError);
      });
    
    res.status(200).json({
      message: "Verification code sent successfully!"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Forgot Password - Generate 6-digit code and send email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      // For security, don't reveal if user exists
      return res.status(200).json({ 
        message: "If an account exists with that email, a password reset code has been sent." 
      });
    }
    
    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpires = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    
    // Store the hashed verification code and expiration in the user document
    user.resetPasswordCode = verificationCode; // Store plain code temporarily
    user.resetCodeExpires = codeExpires;
    await user.save();
    
    // Send verification email with password reset code in the background
    const resetCodeMessage = `Password Reset Code: ${verificationCode}`;
    sendVerificationEmail(user.email, verificationCode) // Just send the code, not the message
      .then(emailResult => {
        if (!emailResult.success) {
          console.error('Failed to send password reset email:', emailResult.error);
        }
      })
      .catch(emailError => {
        console.error('Error sending password reset email:', emailError);
      });
    
    res.status(200).json({ 
      message: "Password reset code sent to your email." 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reset Password - Update password with new one using JWT token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, email } = req.body;
    
    // Validate input
    if (!token || !newPassword || !email) {
      return res.status(400).json({ message: "Token, email, and new password are required" });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Check password strength
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    
    // Verify the reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if email matches
    if (decoded.email !== email) {
      return res.status(400).json({ message: "Invalid reset token" });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if the new password is the same as the old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "This Password is already used. Change it" });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear the reset password code and expiration
    user.resetPasswordCode = undefined;
    user.resetCodeExpires = undefined;
    
    await user.save();
    
    res.status(200).json({ 
      message: "Password has been reset successfully!" 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify Password Reset Code - Validate 6-digit code and generate reset token
// const verifyPasswordResetCode = async (req, res) => {
//   try {
//     const { email, code } = req.body;
    
//     // Validate input
//     if (!email || !code) {
//       return res.status(400).json({ message: "Email and code are required" });
//     }
    
//     // Validate email format
//     const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }
    
//     // Validate code format (6-digit number)
//     if (!/^[0-9]{6}$/.test(code)) {
//       return res.status(400).json({ message: "Invalid verification code format" });
//     }
    
//     // Find user with the verification code and check if it hasn't expired
//     const user = await User.findOne({ 
//       email: email.trim().toLowerCase(),
//       resetPasswordCode: code,
//       resetCodeExpires: { $gt: Date.now() } // Check if code hasn't expired
//     });
    
//     if (!user) {
//       return res.status(400).json({ 
//         message: "Invalid or expired verification code" 
//       });
//     }
    
//     // Check if code has expired
//     if (user.resetCodeExpires < Date.now()) {
//       return res.status(400).json({ 
//         message: "Verification code has expired" 
//       });
//     }
    
//     // If valid, generate reset token with 60s (1 min) expiry
//     const resetPayload = {
//       email: email
//     };
//     const resetToken = jwt.sign(resetPayload, process.env.JWT_SECRET, { expiresIn: "60s" });
    
//     // Clear the reset password code after successful verification
//     user.resetPasswordCode = undefined;
//     user.resetCodeExpires = undefined;
//     await user.save();
    
//     res.status(200).json({ 
//       success: true,
//       message: "Code verified successfully!",
//       resetToken: resetToken
//     });
//   } catch (error) {
//     if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
//       return res.status(400).json({ message: "Invalid or expired verification code" });
//     }
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ message: "Invalid verification code format" });
    }

    // ✅ STEP 1: Find user by email ONLY
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !user.resetPasswordCode) {
      return res.status(400).json({
        errorType: "INVALID_CODE",
        message: "Invalid verification code",
      });
    }

    // ✅ STEP 2: Check expiration
    if (user.resetCodeExpires < Date.now()) {
      return res.status(400).json({
        errorType: "CODE_EXPIRED",
        message: "Verification code has expired",
      });
    }

    // ✅ STEP 3: Check code match
    if (user.resetPasswordCode !== code) {
      return res.status(400).json({
        errorType: "INVALID_CODE",
        message: "Invalid verification code",
      });
    }

    // ✅ SUCCESS
    const resetToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "60s" }
    );

    user.resetPasswordCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Code verified successfully!",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Refresh Access Token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Check if it's actually a refresh token
    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.id);
    
    res.json({
      accessToken: newAccessToken
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, verifyCode, resendVerificationEmail, verifyLoginCode, forgotPassword, resetPassword, verifyPasswordResetCode, refreshAccessToken };
