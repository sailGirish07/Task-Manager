const Message = require("../models/Message");
const jwt = require('jsonwebtoken');

const User = require("../models/User");
const Notification = require("../models/Notification");

// Global variable to hold the io instance
let ioInstance = null;

// Function to set io instance from server
const setIo = (io) => {
  ioInstance = io;
};

// Send a direct message to a user
const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, messageType = "text" } = req.body;
    const file = req.file; // Get uploaded file

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Check if recipient is online (active within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isRecipientOnline = recipient.lastActive >= fiveMinutesAgo;

    // Prepare message data
    const messageData = {
      sender: req.user._id,
      recipient: recipientId,
      messageType,
      status: isRecipientOnline ? "delivered" : "sent",
      deliveredAt: isRecipientOnline ? new Date() : null,
    };

    // Set content based on message type
    if (file && messageType === 'file') {
      // For file messages, set content to file information
      messageData.content = file.originalname; // Store original filename as content
      messageData.fileUrl = `/uploads/${file.filename}`; // Store file path
      messageData.fileName = file.originalname;
      messageData.fileSize = file.size;
      messageData.fileType = file.mimetype;
    } else {
      // For text messages, use the provided content
      messageData.content = content;
    }

    // Create the message with appropriate status
    const message = new Message(messageData);

    await message.save();
    
    // Create notification for recipient - using both fields to ensure compatibility
    await Notification.create({
      recipient: recipientId,  // Keep the recipient field for direct message lookup
      userId: recipientId,     // Also use userId field to match notification controller
      type: "message",
      message: `${req.user.name} sent you a message`,
      relatedUser: req.user._id,
      relatedMessage: message._id,
    });
    
    // Populate sender and recipient info for response
    await message.populate("sender", "name email profileImageUrl");
    await message.populate("recipient", "name email profileImageUrl");
    
    // Emit real-time message to recipient via socket if available
    if (ioInstance) {
      ioInstance.to(recipientId.toString()).emit('newMessage', {
        message: message.toObject(),
        sender: req.user,
        conversationUpdate: {
          lastMessage: file && messageType === 'file' ? `Sent a file: ${file.originalname}` : message.content,
          lastMessageAt: message.createdAt,
        }
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Get direct messages between two users
const getDirectMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find messages between these two users, excluding deleted ones
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id }
          ]
        },
        { isDeleted: { $ne: true } }
      ]
    })
      .populate("sender", "name email profileImageUrl")
      .populate("recipient", "name email profileImageUrl")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      $and: [
        {
          $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id }
          ]
        },
        { isDeleted: { $ne: true } }
      ]
    });

    res.json({
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Get user's conversations (list of users they've messaged)
const getUserConversations = async (req, res) => {
  try {
    // Get all direct messages where user is sender or recipient, excluding deleted
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        },
        { recipient: { $ne: null } }, // Only direct messages, not group messages
        { isDeleted: { $ne: true } }
      ]
    })
      .populate("sender", "name email profileImageUrl")
      .populate("recipient", "name email profileImageUrl")
      .sort({ createdAt: -1 });

    // Get unique conversations (other users)
    const seenUsers = new Set();
    const conversations = [];

    for (const message of messages) {
      const otherUser = message.sender._id.toString() === req.user._id.toString() 
        ? message.recipient 
        : message.sender;
      
      if (!seenUsers.has(otherUser._id.toString())) {
        seenUsers.add(otherUser._id.toString());
        conversations.push({
          user: otherUser,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          unreadCount: await Message.countDocuments({
            $and: [
              { sender: otherUser._id },
              { recipient: req.user._id },
              { "readBy.user": { $ne: req.user._id } },
              { isDeleted: { $ne: true } }
            ]
          })
        });
      }
    }

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};







// Delete a message (user can delete their own messages)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      console.error(`Message with ID ${messageId} not found`);
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the sender
    let canDelete = message.sender.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({ message: "You don't have permission to delete this message" });
    }

    // Get the original message before deletion to use in notification
    const originalMessage = await Message.findById(messageId);
    
    // Soft delete the message
    await Message.findByIdAndUpdate(messageId, {
      isDeleted: true,
      deletedBy: req.user._id,
      deletedAt: new Date()
    });
    
    // Create notification for message deletion
    if (originalMessage.recipient) {
      // For direct messages, notify the recipient
      const recipientId = originalMessage.sender.toString() === req.user._id.toString() 
        ? originalMessage.recipient 
        : originalMessage.sender;
      
      await Notification.create({
        recipient: recipientId,  // Keep recipient field for direct lookup
        userId: recipientId,     // Also use userId field to match notification controller
        type: "message",
        title: "Message Deleted",
        message: `${req.user.name} deleted a message`,
        relatedUser: req.user._id,
        relatedMessage: originalMessage._id,
      });
    }
    
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.body; // Sender whose messages we're reading

    // Update all unread messages from sender to current user
    const result = await Message.updateMany(
      {
        sender: senderId,
        recipient: req.user._id,
        status: { $ne: "read" }
      },
      {
        status: "read",
        readAt: new Date(),
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ 
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update message status to delivered (called when user comes online)
const updateMessageStatus = async (req, res) => {
  try {
    const { senderId } = req.body;

    // Update all sent messages to delivered
    const result = await Message.updateMany(
      {
        sender: senderId,
        recipient: req.user._id,
        status: "sent"
      },
      {
        status: "delivered",
        deliveredAt: new Date()
      }
    );

    res.json({ 
      message: "Messages marked as delivered",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const path = require('path');
const fs = require('fs');

// Function to handle file downloads
const downloadFile = async (req, res) => {
  const filename = req.params.filename;
  
  // Validate filename to prevent directory traversal attacks
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ message: 'Invalid filename' });
  }
  
  try {
    // Extract token from query parameter or Authorization header
    let token = req.query.token || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    
    // Find messages containing this file
    const message = await Message.findOne({
      fileUrl: `/uploads/${filename}`,
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    });
    
    if (!message) {
      return res.status(403).json({ message: 'You do not have permission to access this file' });
    }
    
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', message.fileType);
    
    // Preserve original filename from database
    const originalName = message.fileName;
    const encodedName = encodeURIComponent(originalName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedName}; filename="${originalName}"`
    );
    
    // Stream the file directly
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to handle file viewing (for display in browser or download)
const viewImage = async (req, res) => {
  const filename = req.params.filename;
  
  // Validate filename to prevent directory traversal attacks
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ message: 'Invalid filename' });
  }
  
  try {
    // Extract token from query parameter or Authorization header
    let token = req.query.token || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    
    // Find messages containing this file
    const message = await Message.findOne({
      fileUrl: `/uploads/${filename}`,
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    });
    
    if (!message) {
      return res.status(403).json({ message: 'You do not have permission to access this file' });
    }
    
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // For images, display inline in browser; for other files, prompt download
    if (message.fileType?.startsWith('image/')) {
      // Set headers for inline image display
      res.setHeader('Content-Type', message.fileType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Content-Disposition', 'inline');
    } else {
      // Set headers to prompt download for non-image files
      res.setHeader('Content-Type', message.fileType);
      
      // Preserve original filename from database
      const originalName = message.fileName;
      const encodedName = encodeURIComponent(originalName);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodedName}; filename="${originalName}"`
      );
    }
    
    // Stream the file directly
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Error viewing file:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports = {
  sendDirectMessage,

  getDirectMessages,

  getUserConversations,
  deleteMessage,
  markMessagesAsRead,
  updateMessageStatus,
  setIo,
  downloadFile,
  viewImage,
};



