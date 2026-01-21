import { useState, useEffect, useContext, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { UserContext } from "../context/UserContext";
import { socket } from "./utils/socket";
import { getImageUrl } from "../utils/imageUtils";

const MessagingModal = ({ isOpen, onClose }) => {
  const { user } = useContext(UserContext);

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // File sharing functionality - fresh implementation
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [allUsers, setAllUsers] = useState([]); // For messaging
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    messageId: null,
  }); // Context menu for message deletion
  const contextMenuRef = useRef(null);
  const messagesEndRef = useRef(null); // For auto-scrolling to bottom
  const messagesContainerRef = useRef(null); // For messages container
  const fileInputRef = useRef(null); // For file input
  // For click outside detection handled by parent div onClick

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchAllUsers(); // For messaging
      checkOnlineStatus(); // Initial check

      // Connect to socket and join user room
      if (typeof socket !== "undefined" && socket && user) {
        socket.emit("join", user._id);
      }

      // Poll online status every 30 seconds
      const intervalId = setInterval(() => {
        checkOnlineStatus();
      }, 30000);

      // Cleanup interval on modal close
      return () => clearInterval(intervalId);
    }
  }, [isOpen, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle clicks outside context menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setContextMenu({ show: false, x: 0, y: 0, messageId: null });
      }
    };

    if (contextMenu.show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu.show]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        // Use setTimeout to ensure DOM is updated before scrolling
        setTimeout(() => {
          // Scroll to the bottom
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }, 50); // Small delay to ensure DOM update
      }
    };

    // Only scroll when new messages are added (not on initial load)
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]); // Only run when messages change

  // Clean up image object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      messages.forEach(msg => {
        if (msg.imagePreviewUrl) {
          URL.revokeObjectURL(msg.imagePreviewUrl);
        }
      });
    };
  }, [messages]);

  // Handle real-time messages
  useEffect(() => {
    if (typeof socket !== "undefined" && socket && isOpen) {
      const handleNewMessage = (data) => {
        // Update conversations list with new message
        setConversations((prevConversations) => {
          const updatedConversations = [...prevConversations];
          const conversationIndex = updatedConversations.findIndex(
            (conv) => conv.user._id === data.sender._id
          );

          if (conversationIndex !== -1) {
            // Update existing conversation
            updatedConversations[conversationIndex] = {
              ...updatedConversations[conversationIndex],
              lastMessage: data.conversationUpdate.lastMessage,
              lastMessageAt: data.conversationUpdate.lastMessageAt,
              unreadCount:
                updatedConversations[conversationIndex].unreadCount + 1,
            };
          } else {
            // Add new conversation if not exists
            updatedConversations.unshift({
              user: data.sender,
              lastMessage: data.conversationUpdate.lastMessage,
              lastMessageAt: data.conversationUpdate.lastMessageAt,
              unreadCount: 1,
            });
          }

          return updatedConversations;
        });

        // If this message is for the currently selected chat, update messages
        if (
          selectedChat &&
          selectedChat.type === "user" &&
          selectedChat.id === data.sender._id
        ) {
          setMessages((prevMessages) => [...prevMessages, data.message]);
        }
      };

      socket.on("newMessage", handleNewMessage);

      return () => {
        if (typeof socket !== "undefined" && socket) {
          socket.off("newMessage", handleNewMessage);
        }
      };
    }
  }, [socket, selectedChat, isOpen]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      markMessagesAsRead(); // Mark as read when opening chat
      updateMessageStatusToDelivered(); // Update to delivered if not already
    }
  }, [selectedChat]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_CONVERSATIONS
      );
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.USERS.GET_ALL_USERS_FOR_MESSAGING
      );
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    }
  };

  const checkOnlineStatus = async () => {
    // Fetch real online status from backend
    try {
      const response = await axiosInstance.get(
        API_PATHS.USERS.GET_ONLINE_STATUS
      );
      const onlineIds = new Set(response.data.onlineUserIds || []);
      setOnlineUsers(onlineIds);
    } catch (error) {
      console.error("Error checking online status:", error);
      // Keep previous state on error
    }
  };


  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (selectedChat.type === "user") {
        response = await axiosInstance.get(
          API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
        );
      } else {
        response = await axiosInstance.get(
          API_PATHS.MESSAGES.GET_GROUP_MESSAGES(selectedChat.id)
        );
      }
      
      let messages = response.data.messages || [];
      
      // Reverse the messages for display (newest at bottom)
      messages.reverse();
      
      // Preload image previews for file messages that are images
      messages = await Promise.all(messages.map(async (msg) => {
        if (msg.messageType === 'file' && msg.fileType?.startsWith('image/')) {
          try {
            const filename = msg.fileUrl.split('/').pop();
            const imageUrl = `${API_PATHS.BASE_URL}${API_PATHS.MESSAGES.VIEW_IMAGE(filename)}`;
            const token = localStorage.getItem('token');
            
            const imageResponse = await fetch(imageUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (imageResponse.ok) {
              const blob = await imageResponse.blob();
              const previewUrl = URL.createObjectURL(blob);
              
              // Return a new message object with the preview URL
              return {
                ...msg,
                imagePreviewUrl: previewUrl
              };
            }
          } catch (err) {
            console.error('Error loading image preview:', err);
          }
        }
        return msg;
      }));
      
      setMessages(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedChat || selectedChat.type !== "user") return;

    try {
      await axiosInstance.put(API_PATHS.MESSAGES.MARK_MESSAGES_AS_READ, {
        senderId: selectedChat.id,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const updateMessageStatusToDelivered = async () => {
    if (!selectedChat || selectedChat.type !== "user") return;

    try {
      await axiosInstance.put(API_PATHS.MESSAGES.UPDATE_MESSAGE_STATUS, {
        senderId: selectedChat.id,
      });
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  };

  const deleteMessage = async (messageId) => {
    // Close context menu first
    setContextMenu({ show: false, x: 0, y: 0, messageId: null });

    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await axiosInstance.delete(API_PATHS.MESSAGES.DELETE_MESSAGE(messageId));
      // Refresh messages
      await fetchMessages();
      // Clear any previous error
      setError(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      if (error.response?.status === 404) {
        setError("Message not found or already deleted");
      } else {
        setError(
          "Failed to delete message: " +
            (error.response?.data?.message || error.message)
        );
      }
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedChat) return;

    try {
      setError(null);
      
      const formData = new FormData();
      
      if (selectedFile) {
        // Send file message
        formData.append('messageType', 'file');
        formData.append('file', selectedFile);
        if (newMessage.trim()) {
          formData.append('content', newMessage);
        }
        setIsUploading(true);
      } else {
        // Send text message
        formData.append('messageType', 'text');
        formData.append('content', newMessage);
      }

      if (selectedChat.type === "user") {
        formData.append('recipientId', selectedChat.id);
        await axiosInstance.post(
          API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          }
        );
      } else {
        formData.append('groupId', selectedChat.id);
        await axiosInstance.post(
          API_PATHS.MESSAGES.SEND_GROUP_MESSAGE,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          }
        );
      }

      setNewMessage("");
      // Reset file state after successful send
      if (selectedFile) {
        setSelectedFile(null);
        setIsUploading(false);
        setUploadProgress(0);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      // Reset upload state on error
      setIsUploading(false);
      setUploadProgress(0);
    }
  };



  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isUploading) {
        sendMessage();
      }
    }
  };

  // Fresh file upload implementation with real-time functionality
  const handleFileUpload = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit");
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'image/*',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip'
      ];
      
      setSelectedFile(file);
      setIsUploading(false); // Reset upload state for preview
      setUploadProgress(0);
      setError(null); // Clear any previous errors
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileClick = async (msg) => {
    try {
      // Get the filename from the fileUrl
      const filename = msg.fileUrl.split('/').pop();
      
      // Construct the download URL with the filename
      const downloadUrl = `${API_PATHS.BASE_URL}${API_PATHS.MESSAGES.DOWNLOAD_FILE(filename)}`;
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Fetch the file with Authorization header to preserve binary integrity
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      // Get the content disposition header to extract the original filename
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadedFilename = msg.fileName || filename;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.*)|filename\*=(.*)|filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;\s]*)/);
        if (filenameMatch) {
          downloadedFilename = decodeURIComponent(filenameMatch[1] || filenameMatch[2] || filenameMatch[3] || filenameMatch[4] || downloadedFilename);
        }
      }
      
      // Use the browser's native download functionality with a Blob
      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }
      
      console.log("Downloaded MIME:", blob.type);
      
      // Create a temporary download link
      const downloadLink = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      downloadLink.href = url;
      downloadLink.download = downloadedFilename;
      downloadLink.style.display = 'none';
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the URL object after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const handleImageClick = async (msg) => {
    try {
      // Get the filename from the fileUrl
      const filename = msg.fileUrl.split('/').pop();
      
      // Construct the view URL with the filename
      const imageUrl = `${API_PATHS.BASE_URL}${API_PATHS.MESSAGES.VIEW_IMAGE(filename)}`;
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Open image in new tab for viewing by creating a temporary link with authorization
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Image view failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const imageObjectUrl = URL.createObjectURL(blob);
      const imageWindow = window.open();
      imageWindow.document.write(`<img src="${imageObjectUrl}" alt="${msg.fileName}" style="max-width:100%; max-height:100%;" />`);
      
      // Clean up the URL object after some time
      setTimeout(() => URL.revokeObjectURL(imageObjectUrl), 5000);
    } catch (error) {
      console.error('Error viewing image:', error);
      setError('Failed to view image');
    }
  };

  const handleImageView = async (msg) => {
    try {
      // Get the filename from the fileUrl
      const filename = msg.fileUrl.split('/').pop();
      
      // Construct the view URL with the filename
      const imageUrl = `${API_PATHS.BASE_URL}${API_PATHS.MESSAGES.VIEW_IMAGE(filename)}`;
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Open image in new tab for viewing by creating a temporary link with authorization
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Image view failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const imageObjectUrl = URL.createObjectURL(blob);
      const imageWindow = window.open();
      imageWindow.document.write(`<img src="${imageObjectUrl}" alt="${msg.fileName}" style="max-width:100%; max-height:100%;" />`);
      
      // Clean up the URL object after some time
      setTimeout(() => URL.revokeObjectURL(imageObjectUrl), 5000);
    } catch (error) {
      console.error('Error viewing image:', error);
      setError('Failed to view image');
    }
  };

  const handleImageDownload = async (msg) => {
    try {
      // Get the filename from the fileUrl
      const filename = msg.fileUrl.split('/').pop();
      
      // Construct the download URL with the filename
      const downloadUrl = `${API_PATHS.BASE_URL}${API_PATHS.MESSAGES.DOWNLOAD_FILE(filename)}`;
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Fetch the file with Authorization header to preserve binary integrity
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      // Get the content disposition header to extract the original filename
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadedFilename = msg.fileName || filename;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.*)|filename\*=(.*)|filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;\s]*)/);
        if (filenameMatch) {
          downloadedFilename = decodeURIComponent(filenameMatch[1] || filenameMatch[2] || filenameMatch[3] || filenameMatch[4] || downloadedFilename);
        }
      }
      
      // Use the browser's native download functionality with a Blob
      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }
      
      console.log("Downloaded MIME:", blob.type);
      
      // Create a temporary download link
      const downloadLink = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      downloadLink.href = url;
      downloadLink.download = downloadedFilename;
      downloadLink.style.display = 'none';
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the URL object after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 200);
    } catch (error) {
      console.error('Error downloading image:', error);
      setError('Failed to download image');
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || "?";
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();

    // Check if same day
    const isToday = date.toDateString() === today.toDateString();

    // Check if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      // Show time for today's messages
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      // Show date for older messages
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleContextMenu = (e, messageId, canDelete) => {
    e.preventDefault(); // Prevent default context menu

    if (!canDelete) return; // Only show context menu if user can delete the message

    // Calculate position to ensure menu stays within viewport
    const menuWidth = 120; // Approximate width of the context menu
    const menuHeight = 40; // Approximate height of the context menu

    let posX = e.clientX;
    let posY = e.clientY;

    // Adjust position if menu would go outside viewport
    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 10;
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      show: true,
      x: posX,
      y: posY,
      messageId: messageId,
    });
  };

  const filteredConversations =
    conversations?.filter(
      (conv) =>
        conv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Filter all users for starting new conversations
  const filteredAllUsers =
    allUsers?.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Get user IDs already in conversations to avoid duplicates
  const conversationUserIds = new Set(
    conversations?.map((conv) => conv.user._id) || []
  );

  // Users not in conversations yet (for new conversations)
  const newUsers = filteredAllUsers.filter(
    (u) => !conversationUserIds.has(u._id)
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/50"
      onClick={onClose}
      style={{ margin: 0, padding: "1rem" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "85vh", maxHeight: "90vh" }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR */}
          <div className="w-[340px] border-r flex flex-col h-full">
            {/* Search */}
            <div className="px-5 py-4 border-b">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search users to message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

            </div>

            {/* User/Group List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                {/* Existing Conversations */}
                {filteredConversations.length > 0 && (
                  <>

                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.user._id}
                          onClick={() => {
                            setSelectedChat({
                              type: "user",
                              id: conv.user._id,
                              name: conv.user.name,
                              email: conv.user.email,
                              profileImageUrl: conv.user.profileImageUrl,
                            });
                            setSearchTerm("");
                          }}
                          className={`px-5 py-4 cursor-pointer transition-all duration-200 ${
                            selectedChat?.type === "user" &&
                            selectedChat?.id === conv.user._id
                              ? "bg-blue-50 border-l-4 border-l-blue-600"
                              : "border-l-4 border-l-transparent hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {conv.user.profileImageUrl ? (
                                <img
                                  src={getImageUrl(conv.user.profileImageUrl)}
                                  alt={conv.user.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(conv.user.name)}
                                </div>
                              )}
                              {/* Online/Offline Status Indicator */}
                              <div
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                  isUserOnline(conv.user._id)
                                    ? "bg-green-500"
                                    : "bg-gray-300"
                                }`}
                              ></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 text-sm">
                                  {conv.user.name}
                                </p>
                                <span className="text-xs text-gray-400">
                                  {new Date(
                                    conv.lastMessageAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {conv.lastMessage}
                              </p>
                            </div>
                            {selectedChat?.type === "user" &&
                              selectedChat?.id === conv.user._id && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* New Users (not in conversations yet) */}
                  {searchTerm && newUsers.length > 0 && (
                    <>
                      {newUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => {
                            setSelectedChat({
                              type: "user",
                              id: user._id,
                              name: user.name,
                              email: user.email,
                              profileImageUrl: user.profileImageUrl,
                            });
                            setSearchTerm("");
                          }}
                          className={`px-5 py-4 cursor-pointer transition-all duration-200 ${
                            selectedChat?.type === "user" &&
                            selectedChat?.id === user._id
                              ? "bg-blue-50 border-l-4 border-l-blue-600"
                              : "border-l-4 border-l-transparent hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {user.profileImageUrl ? (
                                <img
                                  src={getImageUrl(user.profileImageUrl)}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(user.name)}
                                </div>
                              )}
                              {/* Online/Offline Status Indicator */}
                              <div
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                  isUserOnline(user._id)
                                    ? "bg-green-500"
                                    : "bg-gray-300"
                                }`}
                              ></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                            {selectedChat?.type === "user" &&
                              selectedChat?.id === user._id && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Empty State */}
                  {!searchTerm && filteredConversations.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <p>No conversations yet</p>
                      <p className="text-xs mt-1">
                        Search for users to start messaging
                      </p>
                    </div>
                  )}

                  {/* No Results */}
                  {searchTerm &&
                    filteredConversations.length === 0 &&
                    newUsers.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <p>No users found</p>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 flex flex-col h-full bg-white">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {selectedChat.profileImageUrl ? (
                        <img
                          src={getImageUrl(selectedChat.profileImageUrl)}
                          alt={selectedChat.name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                          {getInitials(selectedChat.name)}
                        </div>
                      )}
                      {/* Online/Offline Status for chat header */}
                      {selectedChat.type === "user" && (
                        <div
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            isUserOnline(selectedChat.id)
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">
                        {selectedChat.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {isUserOnline(selectedChat.id)
                          ? "Online"
                          : "Offline"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-3 bg-white"
                >
                  {messages.length > 0 ? (
                    messages.map((msg) => {
                      const isCurrentUser = msg.sender?._id === user?._id;
                      const canDeleteMessage = isCurrentUser;

                      return (
                        <div
                          key={msg._id}
                          className={`flex ${
                            isCurrentUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isCurrentUser && (
                            msg.sender?.profileImageUrl ? (
                              <img
                                src={getImageUrl(msg.sender.profileImageUrl)}
                                alt={msg.sender.name}
                                className="w-9 h-9 rounded-full object-cover mr-2 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-xs mr-2 flex-shrink-0">
                                {getInitials(
                                  msg.sender?.name || selectedChat.name
                                )}
                              </div>
                            )
                          )}
                          <div
                            className={`flex flex-col ${
                              isCurrentUser ? "items-end" : "items-start"
                            }`}
                          >
                            {!msg.isDeleted ? (
                              <>
                                <div
                                  className={`px-4 py-2.5 rounded-2xl max-w-md text-sm ${
                                    isCurrentUser
                                      ? "bg-blue-500 text-white rounded-tr-sm"
                                      : "bg-gray-100 text-gray-900 rounded-tl-sm"
                                  }`}
                                  onContextMenu={(e) =>
                                    handleContextMenu(
                                      e,
                                      msg._id,
                                      canDeleteMessage
                                    )
                                  }
                                >
                                  <div className="flex items-end gap-1.5">
                                    {msg.messageType === 'file' ? (
                                      msg.fileType?.startsWith('image/') ? (
                                        // Image file - show directly
                                        <div onClick={() => handleImageDownload(msg)} className="cursor-pointer">
                                          <img
                                            src={`${API_PATHS.BASE_URL}${API_PATHS.MESSAGES.VIEW_IMAGE(msg.fileUrl.split('/').pop())}`}
                                            onError={(e) => {
                                              // Fallback to handle image loading
                                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' fill='%23dee2e6'%3E%3Crect width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%236c757d'%3EImage%3C/tex%3E%3C/svg%3E";
                                            }}


                                            alt={msg.fileName}
                                            className="max-w-[120px] max-h-32 rounded-lg object-cover"
                                          />
                                        </div>
                                      ) : (
                                        // Non-image file - show as attachment
                                        <div

                                          className="flex flex-col gap-1 cursor-pointer"
                                          onClick={() => handleFileClick(msg)}
                                        >
                                          <div className="flex items-start gap-2 p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                                            <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center bg-gray-100">
                                              {msg.fileType === 'application/pdf' ? (
                                                <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                              ) : msg.fileType?.includes('document') || msg.fileType?.includes('wordprocessing') ? (
                                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                              ) : msg.fileType?.includes('zip') || msg.fileType?.includes('compressed') ? (
                                                <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                                </svg>
                                              ) : (
                                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium text-xs truncate">{msg.fileName}</div>
                                              <div className="text-[10px] text-gray-500">
                                                {`${msg.fileSize > 1024 * 1024 
                                                  ? `${(msg.fileSize / (1024 * 1024)).toFixed(1)} MB` 
                                                  : `${(msg.fileSize / 1024).toFixed(1)} KB`} • ${msg.fileType}`}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    ) : (
                                      <span>{msg.content}</span>
                                    )}
                                    {isCurrentUser && (
                                      <>
                                        {/* Single tick - sent */}
                                        {msg.status === "sent" && (
                                          <svg
                                            className="w-4 h-4 text-white/70 flex-shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2.5}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        )}
                                        {/* Double tick - delivered */}
                                        {msg.status === "delivered" && (
                                          <div className="flex -space-x-1">
                                            <svg
                                              className="w-4 h-4 text-white/70 flex-shrink-0"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M5 13l4 4L19 7"
                                              />
                                            </svg>
                                            <svg
                                              className="w-4 h-4 text-white/70 flex-shrink-0"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M5 13l4 4L19 7"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                        {/* Double tick green - read */}
                                        {msg.status === "read" && (
                                          <div className="flex -space-x-1">
                                            <svg
                                              className="w-4 h-4 text-green-400 flex-shrink-0"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M5 13l4 4L19 7"
                                              />
                                            </svg>
                                            <svg
                                              className="w-4 h-4 text-green-400 flex-shrink-0"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M5 13l4 4L19 7"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {/* Message timestamp */}
                                <span
                                  className={`text-xs mt-1 ${
                                    isCurrentUser
                                      ? "text-gray-400"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                              </>
                            ) : (
                              // Show deleted message placeholder
                              <div className="text-xs text-red-500 italic px-4 py-2.5">
                                {msg.deletedBy && msg.deletedBy._id === user._id
                                  ? "You deleted this message"
                                  : `${msg.sender?.name} deleted this message`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-400 mt-8">
                      No messages yet
                    </p>
                  )}
                  {/* Scroll anchor for auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="px-6 py-4 border-t">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileUpload(e);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-2.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                        title="Attach file"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </button>
                      <input
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-full text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                        className="p-3.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </button>
                    </div>
                    
                    {/* File Upload Preview */}
                    {selectedFile && (
                      <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</div>
                              <div className="text-xs text-gray-500">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={removeSelectedFile}
                            className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Upload Progress Bar */}
                        {isUploading && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Hidden File Input for File Sharing */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          e.stopPropagation();
          handleFileChange(e);
        }}
        onClick={(e) => e.stopPropagation()}
        accept="image/*,application/pdf,.doc,.docx,.txt,.zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />

      {/* Context Menu for Message Deletion */}
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100002] bg-white shadow-lg rounded-md py-1 min-w-[120px] border border-gray-200"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => deleteMessage(contextMenu.messageId)}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            Delete Message
          </button>
        </div>
      )}
    </div>
  );
};

export default MessagingModal;