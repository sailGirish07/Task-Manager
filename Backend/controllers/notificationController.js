const Notification = require("../models/Notification");

// Get all notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    // Look for notifications using both userId and recipient fields to ensure compatibility
    const notifications = await Notification.find({ 
      $or: [
        { userId: req.user._id },
        { recipient: req.user._id }
      ]
    })
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