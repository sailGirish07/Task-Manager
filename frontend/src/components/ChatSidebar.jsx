import React, { useState, useEffect, useRef } from "react";
import { LuSearch, LuSend, LuX } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { socket } from "../utils/socket";
import { getUserProfileImageUrl } from "../../utils/imageUtils";

const ChatSidebar = ({ isOpen, onClose, onSelectChat }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
    
  // Function to check if user is online with 5-minute grace period
  const isUserOnlineWithGracePeriod = (userId, lastActive) => {
    // Check if user is in the online users list
    if (onlineUsers.has(userId)) {
      return true;
    }
      
    // If not in online list, check if last active was within 5 minutes
    if (lastActive) {
      const lastActiveTime = new Date(lastActive).getTime();
      const currentTime = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
      return (currentTime - lastActiveTime) <= fiveMinutes;
    }
      
    return false;
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchUsers();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_CONVERSATIONS);
      // Sort conversations by last message time (most recent first)
      const sortedConversations = response.data.conversations.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.lastMessageTime || a.createdAt || Date.now()).getTime();
        const timeB = new Date(b.lastMessageAt || b.lastMessageTime || b.createdAt || Date.now()).getTime();
        return timeB - timeA; // Descending order (most recent first)
      });
      setConversations(sortedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };
  
  const markMessagesAsRead = async (senderId) => {
    try {
      await axiosInstance.put(API_PATHS.MESSAGES.MARK_MESSAGES_AS_READ, { senderId });
      
      // Update local conversation unread count
      setConversations(prev => 
        prev.map(conv => {
          if (conv.user._id === senderId) {
            return {
              ...conv,
              unreadCount: 0 // Reset unread count after marking as read
            };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS_FOR_MESSAGING);
      const currentUserFilteredUsers = response.data.users.filter(user => user._id !== localStorage.getItem('userId'));
      setUsers(currentUserFilteredUsers);
      setAllUsers(response.data.users); // Store all users for lastActive info
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(chatId)
      );
      setMessages(prev => ({
        ...prev,
        [chatId]: response.data.messages.reverse()
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (chatId) => {
    if (!newMessage.trim() || !chatId) return;

    try {
      const response = await axiosInstance.post(API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE, {
        recipientId: chatId,
        content: newMessage,
        messageType: 'text'
      });

      // Update messages state
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), response.data.message]
      }));

      // Refresh conversations after sending message to ensure correct data
      fetchConversations();
      
      // Auto scroll to bottom when sending message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      setNewMessage("");
      // fetchConversations(); // Refresh conversations to update last message - now called above
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e, chatId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatId);
    }
  };

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    onSelectChat(chat);
    setShowUsers(false);
    setIsLoadingMessages(true); // Show loader when opening chat
    
    try {
      if (!messages[chat.user._id]) {
        await fetchMessages(chat.user._id);
      }
      
      // Mark messages as read when opening the chat
      await markMessagesAsRead(chat.user._id);
    } finally {
      setIsLoadingMessages(false); // Hide loader after messages are loaded
    }
    
    // Auto scroll to bottom when chat is opened
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Sort conversations by last message time (most recent first) and then apply filter
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || a.lastMessageTime || a.createdAt || Date.now()).getTime();
    const timeB = new Date(b.lastMessageAt || b.lastMessageTime || b.createdAt || Date.now()).getTime();
    return timeB - timeA; // Descending order (most recent first)
  });
  
  const filteredConversations = sortedConversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !conversations.some(conv => conv.user._id === user._id)
  );

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    scrollToBottom();
  }, [messages, selectedChat]);

  // Listen for new messages
  useEffect(() => {
    const handleMessageReceive = (message) => {
      setMessages(prev => {
        const updated = { ...prev };
        const chatId = message.sender._id === localStorage.getItem('userId') 
          ? message.recipient._id 
          : message.sender._id;
        
        if (!updated[chatId]) {
          updated[chatId] = [];
        }
        
        updated[chatId] = [...updated[chatId], message];
        return updated;
      });

      // Update conversations to show new message
      setConversations(prev => {
        const updated = prev.map(conv => {
          // Handle both sender and recipient scenarios
          if (conv.user._id === message.sender._id || conv.user._id === message.recipient?._id) {
            return {
              ...conv,
              lastMessage: message.content,
              lastMessageTime: message.createdAt,
              lastMessageType: message.messageType || 'text', // Track message type for file vs text
              // Preserve the user object to maintain correct display
              user: { ...conv.user }, // Keep the original user info in the conversation
              unreadCount: message.sender._id !== localStorage.getItem('userId') ? (conv.unreadCount || 0) + 1 : conv.unreadCount
            };
          }
          return conv;
        });
        
        // Re-sort conversations by last message time after update
        return updated.sort((a, b) => {
          const timeA = new Date(a.lastMessageAt || a.lastMessageTime || a.createdAt || Date.now()).getTime();
          const timeB = new Date(b.lastMessageAt || b.lastMessageTime || b.createdAt || Date.now()).getTime();
          return timeB - timeA; // Descending order (most recent first)
        });
      });
      
      // Auto scroll to bottom when new message arrives
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    socket.on('receiveMessage', handleMessageReceive);

    return () => {
      socket.off('receiveMessage', handleMessageReceive);
    };
  }, []);

  // Listen for profile updates
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
      
      // Update messages if the sender is the updated user
      setMessages(prevMessages => {
        const updatedMessages = {};
        Object.keys(prevMessages).forEach(chatId => {
          updatedMessages[chatId] = prevMessages[chatId].map(message => 
            message.sender._id === data.userId
              ? { ...message, sender: { ...message.sender, profileImageUrl: data.profileImageUrl, name: data.name } }
              : message
          );
        });
        return updatedMessages;
      });
    };
    
    socket.on('profileUpdated', handleProfileUpdate);
    
    return () => {
      socket.off('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Listen for online users
  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(new Set(users));
    };
    
    const handleUserJoined = (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    };
    
    const handleUserLeft = (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };
    
    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    
    // Request current online users
    socket.emit('getOnlineUsers');
    
    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
    };
  }, []);

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <LuX className="text-lg" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowUsers(true)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-center font-medium ${
              !showUsers ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            }`}
            onClick={() => setShowUsers(false)}
          >
            Conversations
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium ${
              showUsers ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            }`}
            onClick={() => setShowUsers(true)}
          >
            New Chat
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedChat ? (
            /* Conversations/List View */
            <div className="overflow-y-auto h-full">
              {showUsers ? (
                /* Users List */
                <>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="p-4 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3"
                        onClick={() => handleSelectChat({ user })}
                      >
                        {user.profileImageUrl ? (
                          <img
                            src={getUserProfileImageUrl(user)}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {user.name}
                          </h4>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm ? "No users found" : "Start a new conversation"}
                    </div>
                  )}
                </>
              ) : (
                /* Conversations List */
                <>
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => (
                      <div
                        key={conv.user._id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedChat?.user._id === conv.user._id
                            ? "bg-blue-50"
                            : ""
                        }`}
                        onClick={() => handleSelectChat(conv)}
                      >
                        <div className="flex items-center gap-3">
                          {conv.user.profileImageUrl ? (
                            <img
                              src={getUserProfileImageUrl(conv.user)}
                              alt={conv.user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {conv.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {conv.user.name}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {isUserOnlineWithGracePeriod(conv.user._id, conv.user.lastActive) ? 'Online' : 'Offline'}
                                </p>
                              </div>
                              {conv.unreadCount > 0 && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {conv.lastMessageType === 'file' 
                                ? `📁 File sent`
                                : conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm ? "No conversations found" : "No conversations yet"}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Chat View */
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                {selectedChat.user.profileImageUrl ? (
                  <img
                    src={getUserProfileImageUrl(selectedChat.user)}
                    alt={selectedChat.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {selectedChat.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedChat.user.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {isUserOnlineWithGracePeriod(selectedChat.user._id, selectedChat.user.lastActive) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {messages[selectedChat.user._id]?.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${
                          message.sender._id === localStorage.getItem("userId")
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.sender._id !== localStorage.getItem("userId") && (
                          <div className="mr-2 flex-shrink-0">
                            {message.sender.profileImageUrl ? (
                              <img
                                src={getUserProfileImageUrl(message.sender)}
                                alt={message.sender.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {message.sender.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.sender._id === localStorage.getItem("userId")
                              ? "bg-blue-500 text-white"
                              : "bg-white text-gray-800"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender._id === localStorage.getItem("userId")
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, selectedChat.user._id)}
                  />
                  <button
                    onClick={() => sendMessage(selectedChat.user._id)}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LuSend className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;