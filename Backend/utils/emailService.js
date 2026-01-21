// Gmail SMTP Implementation with Nodemailer
const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP
let transporter;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Gmail SMTP configuration error:', error.message);
    } else {
      console.log('✅ Gmail SMTP transporter is ready');
    }
  });
} else {
  console.error('❌ Gmail SMTP credentials not set in environment variables!');
  console.log('💡 Set EMAIL_USER and EMAIL_PASS in your .env file');
  transporter = null;
}

const sendVerificationEmail = async (email, code) => {
  try {
    // Check if transporter is properly initialized
    if (!transporter) {
      throw new Error('Email transport is not properly configured. EMAIL_USER and EMAIL_PASS are required.');
    }
    
    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Task Manager - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Task Manager!</h2>
          <p>Thank you for registering. Please use the verification code below to verify your email address:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f5f5f5; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; display: inline-block;">
              <p style="margin: 0; color: #666; font-size: 14px;">Your Verification Code</p>
              <h1 style="margin: 10px 0; color: #007bff; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${code}</h1>
            </div>
          </div>
          
          <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>⚠️ Important:</strong>
          </p>
          <ul style="color: #666;">
            <li>This code will expire in <strong>30 seconds</strong></li>
            <li>Do not share this code with anyone</li>
          </ul>
          
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            If you didn't create an account with Task Manager, please ignore this email.
          </p>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification email:', {
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, token) => {
  try {
    // Check if transporter is properly initialized
    if (!transporter) {
      throw new Error('Email transport is not properly configured. EMAIL_USER and EMAIL_PASS are required.');
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;
    
    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Task Manager - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', {
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};