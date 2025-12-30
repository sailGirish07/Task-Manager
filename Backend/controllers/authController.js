const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");

//Generate Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, profileImageUrl, adminInviteToken } =
      req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Determine user role: Admin if correct token is provided, otherwise Member
    let role = "member";
    if (
      adminInviteToken &&
      adminInviteToken == process.env.ADMIN_INVITE_TOKEN
    ) {
      role = "admin";
    }

    //Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification code using crypto for better security
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpires = new Date(Date.now() + 30 * 1000); // 30 seconds

    //create new user (unverified)
    const user = await User.create({
      name,
      email,
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
    const user = await User.findOne({ email });
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
      // User already verified - generate token and login
      const token = generateToken(user._id);
      
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        token: token,
      });
      return;
    }
    
    // User not verified - send verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpires = new Date(Date.now() + 30 * 1000); // 30 seconds
    
    // Save code to user
    user.verificationCode = verificationCode;
    user.codeExpires = codeExpires;
    await user.save();
    
    // Send verification email with code
    const emailResult = await sendVerificationEmail(email, verificationCode);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ 
        message: "Failed to send verification code. Please try again." 
      });
    }
    
    // Return response indicating verification needed
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
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    // Only update profileImageUrl if it's explicitly provided (including empty string to remove image)
    if (req.body.profileImageUrl !== undefined) {
      user.profileImageUrl = req.body.profileImageUrl;
    }

    if (req.body.password) {
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
    
    // Find user with this verification code
    const user = await User.findOne({ 
      email: email,
      verificationCode: code,
      codeExpires: { $gt: Date.now() } // Check if code hasn't expired
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired verification code" 
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
    
    // Find user with this verification code
    const user = await User.findOne({ 
      email: email,
      verificationCode: code,
      codeExpires: { $gt: Date.now() } // Check if code hasn't expired
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired verification code" 
      });
    }
    
    // Check if code has expired
    if (user.codeExpires < Date.now()) {
      return res.status(400).json({ 
        message: "Verification code has expired" 
      });
    }
    
    // Mark user as verified and save verification timestamp
    user.verified = true;
    user.verifiedAt = new Date(); // Save when user verified
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    
    await user.save();
    
    // Generate token for authenticated user
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: "Email verified successfully!",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      token: token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
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
    const codeExpires = new Date(Date.now() + 30 * 1000); // 30 seconds
    
    // Reset verification status and update code
    user.verified = false;
    user.verifiedAt = null;
    user.verificationCode = verificationCode;
    user.codeExpires = codeExpires;
    
    await user.save();
    
    // Send verification email with code
    const emailResult = await sendVerificationEmail(email, verificationCode);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ 
        message: "Failed to send verification email" 
      });
    }
    
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
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // For security, don't reveal if user exists
      return res.status(200).json({ 
        message: "If an account exists with that email, a password reset code has been sent." 
      });
    }
    
    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // Create JWT token with email and code (60 seconds expiry)
    const payload = {
      email: user.email,
      code: verificationCode
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "60s" });
    
    // Send verification code email
    try {
      await sendVerificationEmail(
        user.email, 
        `Password Reset Code: ${verificationCode}`,
        `<p>You requested a password reset. Your verification code is:</p>
         <h2 style="font-size: 24px; font-weight: bold;">${verificationCode}</h2>
         <p>This code will expire in 60 seconds.</p>
         <p>If you didn't request this, please ignore this email.</p>`
      );
      
      res.status(200).json({ 
        message: "Password reset code sent to your email." 
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ 
        message: "Failed to send password reset code. Please try again." 
      });
    }
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
    
    // Check password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    
    try {
      // Verify the reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if email matches
      if (decoded.email !== email) {
        return res.status(400).json({ message: "Invalid reset token" });
      }
      
      // Find user by email
      const user = await User.findOne({ email });
      
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
      
      await user.save();
      
      res.status(200).json({ 
        message: "Password has been reset successfully!" 
      });
    } catch (jwtError) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify Password Reset Code - Validate 6-digit code and generate reset token
const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Validate input
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }
    
    // Create JWT token with email and code for verification
    const payload = {
      email: email,
      code: code
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "60s" });
    
    // Verify the JWT token (this will throw if expired or invalid)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if code and email match
    if (decoded.code !== code || decoded.email !== email) {
      return res.status(400).json({ message: "Invalid verification code" });
    }
    
    // If valid, generate reset token with 300s (5 min) expiry
    const resetPayload = {
      email: email
    };
    const resetToken = jwt.sign(resetPayload, process.env.JWT_SECRET, { expiresIn: "300s" });
    
    res.status(200).json({ 
      success: true,
      message: "Code verified successfully!",
      resetToken: resetToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, verifyCode, resendVerificationEmail, verifyLoginCode, forgotPassword, resetPassword, verifyPasswordResetCode };
