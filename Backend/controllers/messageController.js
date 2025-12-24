const Message = require("../models/Message");
const Group = require("../models/Group");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Send a direct message to a user
const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, messageType = "text" } = req.body;

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Check if recipient is online (active within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isRecipientOnline = recipient.lastActive >= fiveMinutesAgo;

    // Create the message with appropriate status
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content,
      messageType,
      status: isRecipientOnline ? "delivered" : "sent",
      deliveredAt: isRecipientOnline ? new Date() : null,
    });

    await message.save();
    
    // Create notification for recipient
    await Notification.create({
      recipient: recipientId,
      type: "message",
      message: `${req.user.name} sent you a message`,
      relatedUser: req.user._id,
      relatedMessage: message._id,
    });
    
    // Populate sender and recipient info for response
    await message.populate("sender", "name email profileImageUrl");
    await message.populate("recipient", "name email profileImageUrl");

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send a message to a group
const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, content, messageType = "text" } = req.body;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId).populate("members", "_id");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Create the message
    const message = new Message({
      sender: req.user._id,
      group: groupId,
      content,
      messageType,
    });

    await message.save();
    
    // Populate sender and group info for response
    await message.populate("sender", "name email profileImageUrl");
    await message.populate("group", "name avatar");

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

// Get group messages
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(member => 
      member.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const messages = await Message.find({ 
      group: groupId, 
      isDeleted: { $ne: true } 
    })
      .populate("sender", "name email profileImageUrl")
      .populate("group", "name avatar")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({ 
      group: groupId, 
      isDeleted: { $ne: true } 
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

// Get user's groups
const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: { $in: [req.user._id] }
    }).populate("members", "name email profileImageUrl");

    res.json({ groups });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, isPrivate = false } = req.body;

    // Validate members exist
    const members = await User.find({ _id: { $in: memberIds } });
    if (members.length !== memberIds.length) {
      return res.status(404).json({ message: "Some members not found" });
    }

    const group = new Group({
      name,
      description,
      createdBy: req.user._id,
      members: [...memberIds, req.user._id], // Include creator as member
      admins: [req.user._id], // Creator is admin by default
      isPrivate,
    });

    await group.save();
    await group.populate("members", "name email profileImageUrl");

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add member to group
const addMemberToGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Verify group exists and user is the group creator (only creator can add members)
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only group creator can add members
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group creator can add members" });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.toString() === userId.toString()
    );
    if (isMember) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // Add user to group
    group.members.push(userId);
    await group.save();

    res.json({ message: "Member added successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove member from group
const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Verify group exists and user is the group creator (only creator can remove members)
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only group creator can remove members
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group creator can remove members" });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is a member
    const isMember = group.members.some(member => 
      member.toString() === userId.toString()
    );
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Prevent creator from removing themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Group creator cannot remove themselves" });
    }

    // Remove user from group
    group.members = group.members.filter(member => member.toString() !== userId);
    group.admins = group.admins.filter(admin => admin.toString() !== userId);
    await group.save();

    res.json({ message: "Member removed successfully", group });
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
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if it's a group message and user is admin
    let canDelete = message.sender.toString() === req.user._id.toString();
    if (message.group && !canDelete) {
      const group = await Group.findById(message.group);
      if (group && group.admins.some(admin => admin.toString() === req.user._id.toString())) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ message: "You don't have permission to delete this message" });
    }

    // Soft delete the message
    await Message.findByIdAndUpdate(messageId, {
      isDeleted: true,
      deletedBy: req.user._id,
      deletedAt: new Date()
    });

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

module.exports = {
  sendDirectMessage,
  sendGroupMessage,
  getDirectMessages,
  getGroupMessages,
  getUserConversations,
  getUserGroups,
  createGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  deleteMessage,
  markMessagesAsRead,
  updateMessageStatus,
};