import React, { useState, useEffect, useRef } from "react";
import { LuBell, LuCheck, LuX, LuLoader } from "react-icons/lu";

import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.NOTIFICATIONS.GET_ALL);
      setNotifications(response.data);

      // Calculate unread count
      const unread = response.data.filter(
        (notification) => !notification.read
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on component mount and periodically
  useEffect(() => {
    fetchNotifications();

    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_AS_READ(id));
      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      await axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE(id));
      // Update local state
      setNotifications((prev) =>
        prev.filter((notification) => notification._id !== id)
      );
      setUnreadCount((prev) =>
        notifications.find((n) => n._id === id && !n.read)
          ? Math.max(0, prev - 1)
          : prev
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Close modal when clicking outside is now handled by the close button
  // Removed the automatic close on outside click for modal behavior

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <LuBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification modal */}
      {isOpen && (
        <div
          className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/50"
          onClick={() => setIsOpen(false)}
          style={{ margin: 0, padding: "1rem" }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ height: "85vh", maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Notifications
              </h2>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="p-8 flex justify-center">
                <LuLoader className="animate-spin text-gray-500 text-2xl" />
              </div>
            )}

            {/* Notifications list */}
            {!loading && (
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <LuBell className="mx-auto text-5xl mb-3 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`px-6 py-4 border-b hover:bg-gray-50 transition-colors ${
                        !notification.read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            )}
                            <h4 className="font-medium text-gray-900">
                              {notification.title}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
                              title="Mark as read"
                            >
                              <LuCheck className="text-lg" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                            title="Delete"
                          >
                            <LuX className="text-lg" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
