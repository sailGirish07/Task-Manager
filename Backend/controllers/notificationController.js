const Notification = require("../models/Notification");
const User = require("../models/User");

// Get all notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    // For admin ownership model: admins only see notifications related to their assigned users
    let filter = {
      $or: [
        { userId: req.user._id },
        { recipient: req.user._id }
      ]
    };
    
    if (req.user.role === "admin" && !req.user.isAdminOwner) {
      // For regular admins, also include notifications from or to their assigned members
      const adminMembers = await User.find({ assignedTo: req.user._id }).select('_id');
      const memberIds = adminMembers.map(user => user._id);
      
      filter = {
        $or: [
          { userId: req.user._id },
          { recipient: req.user._id },
          { userId: { $in: [...memberIds, req.user._id] } },
          { recipient: { $in: [...memberIds, req.user._id] } }
        ]
      };
    }
    
    // Look for notifications using both userId and recipient fields to ensure compatibility
    const notifications = await Notification.find(filter)
      .populate("relatedId", "title name")
      .populate("relatedUser", "name email profileImageUrl") // Add related user info
      .populate("relatedMessage", "content createdAt") // Add related message info
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  deleteNotification,
};