import { useState, useEffect, useContext, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { UserContext } from "../context/UserContext";
import { socket } from "./utils/socket";

const MessagingModal = ({ isOpen, onClose }) => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState("personal");
  const [conversations, setConversations] = useState([]);

  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
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
  const [typingUsers, setTypingUsers] = useState({}); // Track typing indicators
  const [readReceipts, setReadReceipts] = useState({}); // Track read receipts
  const contextMenuRef = useRef(null);
  const messagesEndRef = useRef(null); // For auto-scrolling to bottom
  const messagesContainerRef = useRef(null); // For messages container
  const typingTimeoutRef = useRef({}); // Track typing timeouts
  
  // Typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  
  // Cleanup function for typing timeouts
  useEffect(() => {
    // Initialize typing timeout refs
    return () => {
      // Clear any typing timeouts when component unmounts
      Object.keys(typingTimeoutRef.current).forEach(key => {
        if (typingTimeoutRef.current[key]) {
          clearTimeout(typingTimeoutRef.current[key]);
        }
      });
    };
  }, []);
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
  
  // Update read receipts when messages change
  useEffect(() => {
    // Update read receipts based on message status
    const newReadReceipts = {};
    messages.forEach(msg => {
      if (msg.status === 'read') {
        newReadReceipts[msg._id] = 'read';
      }
    });
    setReadReceipts(newReadReceipts);
  }, [messages]);
  
  // Handle typing indicators
  useEffect(() => {
    if (typeof socket !== "undefined" && socket && selectedChat && selectedChat.type === "user") {
      // Send typing indicator when user starts typing
      if (newMessage.trim() !== "") {
        if (!isTyping) {
          setIsTyping(true);
          socket.emit('typing', {
            recipientId: selectedChat.id,
            senderId: user._id,
            isTyping: true
          });
        }
        
        // Clear any existing timeout
        if (typingTimeoutRef.current[selectedChat.id]) {
          clearTimeout(typingTimeoutRef.current[selectedChat.id]);
        }
        
        // Set new timeout to stop typing indicator after 1 second of inactivity
        typingTimeoutRef.current[selectedChat.id] = setTimeout(() => {
          setIsTyping(false);
          socket.emit('typing', {
            recipientId: selectedChat.id,
            senderId: user._id,
            isTyping: false
          });
        }, 1000);
      } else {
        // If message is empty, stop typing indicator
        if (isTyping) {
          setIsTyping(false);
          socket.emit('typing', {
            recipientId: selectedChat.id,
            senderId: user._id,
            isTyping: false
          });
        }
        
        // Clear any existing timeout when message is empty
        if (typingTimeoutRef.current[selectedChat.id]) {
          clearTimeout(typingTimeoutRef.current[selectedChat.id]);
        }
      }
    }
    
    return () => {
      // Clear timeout when component unmounts
      if (typingTimeoutRef.current[selectedChat?.id]) {
        clearTimeout(typingTimeoutRef.current[selectedChat?.id]);
      }
    };
  }, [newMessage, selectedChat, socket, user._id, isTyping]);
  
  // Listen for typing indicators from other users
  useEffect(() => {
    if (typeof socket !== "undefined" && socket && isOpen && selectedChat && selectedChat.type === "user") {
      const handleTyping = (data) => {
        if (data.senderId === selectedChat.id) {
          setTypingUsers(prev => ({
            ...prev,
            [selectedChat.id]: data.isTyping
          }));
          
          // Clear typing indicator after 1.5 seconds of inactivity
          if (typingTimeoutRef.current[`typing_${selectedChat.id}`]) {
            clearTimeout(typingTimeoutRef.current[`typing_${selectedChat.id}`]);
          }
          
          // Set timeout to clear typing indicator after 1.5 seconds
          typingTimeoutRef.current[`typing_${selectedChat.id}`] = setTimeout(() => {
            setTypingUsers(prev => ({
              ...prev,
              [selectedChat.id]: false
            }));
          }, 1500);
        }
      };
      
      socket.on('typing', handleTyping);
      
      return () => {
        socket.off('typing', handleTyping);
        // Clear any typing timeout on unmount
        if (typingTimeoutRef.current[`typing_${selectedChat.id}`]) {
          clearTimeout(typingTimeoutRef.current[`typing_${selectedChat.id}`]);
        }
      };
    }
  }, [socket, selectedChat, isOpen]);
  
  // Listen for read receipts
  useEffect(() => {
    if (typeof socket !== "undefined" && socket && isOpen && selectedChat && selectedChat.type === "user") {
      const handleReadReceipt = (data) => {
        // Update message status when recipient reads the message
        setReadReceipts(prev => ({
          ...prev,
          [data.messageId]: 'read'
        }));
        
        // Update the specific message status to 'read'
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === data.messageId ? { ...msg, status: 'read' } : msg
          )
        );
      };
      
      socket.on('messageRead', handleReadReceipt);
      
      return () => {
        socket.off('messageRead', handleReadReceipt);
      };
    }
  }, [socket, isOpen, selectedChat]);
  
  // Send read receipts when messages are viewed
  useEffect(() => {
    if (selectedChat && messages.length > 0 && typeof socket !== "undefined" && socket && selectedChat.type === "user") {
      // Find messages from the selected user that haven't been marked as read
      const unreadMessages = messages.filter(msg => 
        msg.sender?._id === selectedChat.id && 
        msg.status !== 'read'
      );
      
      if (unreadMessages.length > 0) {
        // Mark these messages as read
        unreadMessages.forEach(msg => {
          // Update local message status
          setMessages(prevMessages => 
            prevMessages.map(m => 
              m._id === msg._id ? { ...m, status: 'read' } : m
            )
          );
          
          // Send read receipt via socket
          socket.emit('messageRead', {
            senderId: msg.sender._id,
            recipientId: user._id,
            messageId: msg._id
          });
          
          // Update message status in backend
          axiosInstance.put(API_PATHS.MESSAGES.MARK_MESSAGES_AS_READ, {
            senderId: msg.sender._id
          }).catch(err => {
            console.error('Error marking message as read:', err);
          });
        });
      }
    }
  }, [selectedChat, messages, socket, user._id]);

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
          // Add the new message to the messages array
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
      
      // Only mark as read/delivered for direct messages
      if (selectedChat.type === "user") {
        markMessagesAsRead(); // Mark as read when opening chat
        updateMessageStatusToDelivered(); // Update to delivered if not already
      }
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
      
      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
      );
      setMessages(response.data.messages?.reverse() || []);
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
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setError(null);
      const messageData = {
        content: newMessage,
        messageType: "text",
        recipientId: selectedChat.id,
      };

      await axiosInstance.post(
        API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE,
        messageData
      );

      setNewMessage("");
      await fetchMessages();
      
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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

  // Handle profile updates
  useEffect(() => {
    const handleProfileUpdate = (data) => {
      // Update conversations with new profile image
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.user._id === data.userId 
            ? { ...conv, user: { ...conv.user, profileImageUrl: data.profileImageUrl, name: data.name } }
            : conv
        )
      );
        
      // Update all users list
      setAllUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === data.userId
            ? { ...user, profileImageUrl: data.profileImageUrl, name: data.name }
            : user
        )
      );
        
      // Update messages if the sender is the updated user
      setMessages(prevMessages => 
        prevMessages.map(message => 
          message.sender && message.sender._id === data.userId
            ? { ...message, sender: { ...message.sender, profileImageUrl: data.profileImageUrl, name: data.name } }
            : message
        )
      );
        
      // Update selected chat if it's the updated user
      if (selectedChat && selectedChat.type === 'user' && selectedChat.id === data.userId) {
        setSelectedChat(prev => ({
          ...prev,
          name: data.name,
          profileImageUrl: data.profileImageUrl
        }));
      }
    };
      
    const handleProfileUpdateAndRefresh = (data) => {
      handleProfileUpdate(data);
      fetchConversations(); // Refresh conversations to ensure latest data
    };
      
    if (typeof socket !== "undefined" && socket && isOpen) {
      socket.on('profileUpdated', handleProfileUpdateAndRefresh);
    }
      
    return () => {
      if (typeof socket !== "undefined" && socket) {
        socket.off('profileUpdated', handleProfileUpdateAndRefresh);
      }
    };
  }, [socket, isOpen, selectedChat, fetchConversations]);


  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/50"
      style={{ margin: 0, padding: "1rem" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col"
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
            <div className="px-5 py-5 border-b">
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
              {searchTerm && (
                <p className="text-xs text-gray-500 mt-2">
                  Found {filteredConversations.length + newUsers.length} result(s)
                </p>
              )}
            </div>



            {/* User/Group List */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              {activeTab === "personal" && (
                <>
                  {/* Existing Conversations */}
                  {filteredConversations.length > 0 && (
                    <>
                      {searchTerm && (
                        <div className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                          Conversations
                        </div>
                      )}
                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.user._id}
                          onClick={() => {
                            setSelectedChat({
                              type: "user",
                              id: conv.user._id,
                              name: conv.user.name,
                              email: conv.user.email,
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
                                  src={conv.user.profileImageUrl}
                                  alt={conv.user.name}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
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
                      <div className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                        New Conversation
                      </div>
                      {newUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => {
                            setSelectedChat({
                              type: "user",
                              id: user._id,
                              name: user.name,
                              email: user.email,
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
                                  src={user.profileImageUrl}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
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
                      <div className="w-11 h-11 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                        {getInitials(selectedChat.name)}
                      </div>
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
                                src={msg.sender.profileImageUrl}
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
                                    <span>{msg.content}</span>
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
                <div className="px-6 py-4 border-t flex flex-col gap-2">
                  {/* Typing indicator */}
                  {typingUsers[selectedChat?.id] && (
                    <div className="text-xs text-gray-500 px-4">
                      {selectedChat?.name} is typing...
                    </div>
                  )}
                  
                  <div className="flex gap-3 items-center">
                    <input
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-full text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
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
