export const BASE_URL = "http://localhost:8000";

export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register", // Register a new user (Admin or Member) ok
    LOGIN: "/api/auth/login", // Authenticate user & return JWT token ok
    VERIFY_LOGIN_CODE: "/api/auth/verify-login-code", // Verify login code and generate token
    VERIFY_CODE: "/api/auth/verify-code", // Verify user email with code
    RESEND_CODE: "/api/auth/resend-code", // Resend verification code
    VERIFY_PASSWORD_RESET_CODE: "/api/auth/verify-password-reset-code", // Verify password reset code
    FORGOT_PASSWORD: "/api/auth/forgot-password", // Request password reset
    RESET_PASSWORD: "/api/auth/reset-password", // Reset password with token
    GET_PROFILE: "/api/auth/profile", // Get logged-in user details ok
    UPDATE_PROFILE: "/api/auth/profile", // Update user profile
  },

  USERS: {
    GET_ALL_USERS: "/api/users", // Get all users (Admin only)   ok
    GET_ALL_USERS_FOR_MESSAGING: "/api/users/messaging/all", // Get all users for messaging (All authenticated users)
    GET_ONLINE_STATUS: "/api/users/online-status", // Get online users
    GET_USER_BY_ID: (userId) => `/api/users/${userId}`, // Get user by ID   ok
    CREATE_USER: "/api/users", // Create a new user (Admin only)    No Functional
    UPDATE_USER: (userId) => `/api/users/${userId}`, // Update user details   ok
    DELETE_USER: (userId) => `/api/users/${userId}`, // Delete a user    No Functional
  },

  TASKS: {
    GET_DASHBOARD_DATA: "/api/tasks/dashboard-data", // Get Dashboard Data         ok
    GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data", // Get User Dashboard Data  ok
    GET_ALL_TASKS: "/api/tasks", // Get all tasks (Admin: all, User: only assigned)        ok
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`, // Get task by ID                  ok
    CREATE_TASK: "/api/tasks", // Create a new task (Admin only)                           ok
    UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`, // Update task details
    DELETE_TASK: (taskId) => `/api/tasks/${taskId}`, // Delete a task (Admin only)

    UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`, // Update task status
    UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`, // Update todo checklist
    UPLOAD_ATTACHMENT: "/api/tasks/upload-attachment", // Upload task attachment
  },

  REPORTS: {
    EXPORT_TASKS: "/api/reports/export/tasks", // Download all tasks as an excel file
    EXPORT_USERS: "/api/reports/export/users",
  },

  IMAGE: {
    UPLOAD_IMAGE: "/api/auth/upload-image", // ok (Gives an link to set the profileImage)
  },

  NOTIFICATIONS: {
    GET_ALL: "/api/notifications", // Get all notifications
    MARK_AS_READ: (id) => `/api/notifications/${id}/read`, // Mark notification as read
    MARK_ALL_AS_READ: "/api/notifications/all/read", // Mark all notifications as read
    DELETE: (id) => `/api/notifications/${id}`, // Delete notification
  },

  MESSAGES: {
    // Direct messaging
    SEND_DIRECT_MESSAGE: "/api/messages/direct", // Send direct message
    GET_DIRECT_MESSAGES: (userId) => `/api/messages/direct/${userId}`, // Get direct messages with user
    MARK_MESSAGES_AS_READ: "/api/messages/direct/read", // Mark direct messages as read
    UPDATE_MESSAGE_STATUS: "/api/messages/direct/delivered", // Update message status to delivered

    // Group messaging
    SEND_GROUP_MESSAGE: "/api/messages/group", // Send group message
    GET_GROUP_MESSAGES: (groupId) => `/api/messages/group/${groupId}`, // Get group messages
    GET_GROUPS: "/api/messages/groups", // Get user's groups
    CREATE_GROUP: "/api/messages/groups", // Create a new group
    ADD_MEMBER_TO_GROUP: (groupId, userId) =>
      `/api/messages/groups/${groupId}/members/${userId}`, // Add member to group
    REMOVE_MEMBER_FROM_GROUP: (groupId, userId) =>
      `/api/messages/groups/${groupId}/members/${userId}`, // Remove member from group
    DELETE_MESSAGE: (messageId) => `/api/messages/${messageId}`, // Delete a message

    // Conversations
    GET_CONVERSATIONS: "/api/messages/conversations", // Get user's conversations
    GET_GROUP_CONVERSATIONS: "/api/messages/group-conversations", // Get user's group conversations
  },
};
