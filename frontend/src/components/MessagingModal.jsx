import React, { useState, useEffect, useRef, useContext } from "react";
import { LuSearch, LuSend, LuX, LuEllipsisVertical, LuTrash2 } from "react-icons/lu";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
// import { socket } from "../utils/socket";
import { socket } from "./utils/socket"; 
import { UserContext } from "../context/UserContext";
import { getUserProfileImageUrl } from "../utils/imageUtils";

// Force rebuild - import paths verified
const BASE_URL = "https://task-manager-1-j9dy.onrender.com";

const MessagingModal = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    canDelete: false,
  });
  const [newUsers, setNewUsers] = useState([]);
  const messagesContainerRef = useRef(null);
  const { user } = useContext(UserContext);

  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_CONVERSATIONS);
      setConversations(response.data.conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS_FOR_MESSAGING);
      const currentUserID = localStorage.getItem('userId');
      setUsers(response.data.users.filter(user => user._id !== currentUserID));
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

      setNewMessage("");
      fetchConversations(); // Refresh conversations to update last message
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axiosInstance.delete(`${API_PATHS.MESSAGES.DELETE_MESSAGE}/${messageId}`);
      
      // Update messages to mark as deleted
      setMessages(prev => {
        const updated = {...prev};
        Object.keys(updated).forEach(chatId => {
          updated[chatId] = updated[chatId].map(msg => 
            msg._id === messageId ? {...msg, isDeleted: true} : msg
          );
        });
        return updated;
      });
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleKeyPress = (e, chatId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatId);
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    if (!messages[chat.user._id]) {
      fetchMessages(chat.user._id);
    }
    setShowUsers(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !conversations.some(conv => conv.user._id === user._id)
  );

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e, messageId, canDelete) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId,
      canDelete,
    });
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const isUserOnline = (userId) => {
    return socket.activeUsers?.includes(userId);
  };

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
      setConversations(prev => 
        prev.map(conv => {
          if (conv.user._id === message.sender._id) {
            return {
              ...conv,
              lastMessage: message.content,
              lastMessageTime: message.createdAt
            };
          }
          return conv;
        })
      );
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
      
      // Update selected chat if it's the updated user
      if (selectedChat && selectedChat.user._id === data.userId) {
        setSelectedChat(prev => ({
          ...prev,
          user: { ...prev.user, profileImageUrl: data.profileImageUrl, name: data.name }
        }));
      }
    };
    
    socket.on('profileUpdated', handleProfileUpdate);
    
    return () => {
      socket.off('profileUpdated', handleProfileUpdate);
    };
  }, [selectedChat]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, selectedChat]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOpen ? "block" : "hidden"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex overflow-hidden z-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full z-10"
        >
          <LuX className="text-lg" />
        </button>

        <div className="flex w-full h-full">
          {/* SIDEBAR */}
          <div className="w-80 border-r flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex gap-2 mb-4">
                <button
                  className={`py-2 px-4 rounded-lg text-sm font-medium ${
                    !showUsers
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setShowUsers(false)}
                >
                  <LuSend className="inline mr-2" />
                  Chats
                </button>
                <button
                  className={`py-2 px-4 rounded-lg text-sm font-medium ${
                    showUsers
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setShowUsers(true)}
                >
                  <LuSearch className="inline mr-2" />
                  Search
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {!selectedChat && !showUsers && filteredConversations.length === 0 && (
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
                  <p className="text-xs mt-1">Start messaging a team member</p>
                </div>
              )}

              {showUsers ? (
                <>
                  {/* Users Search Results */}
                  <>
                    {searchTerm && (
                      <div className="p-4 border-b">
                        <h3 className="font-medium text-gray-900 mb-3">Users</h3>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <div
                              key={user._id}
                              className="p-3 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3"
                              onClick={() => handleSelectChat({ user })}
                            >
                              <div className="relative">
                                {user.profileImageUrl ? (
                                  <img
                                    src={getUserProfileImageUrl(user)}
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
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 py-2">No users found</p>
                        )}
                      </div>
                    )}

                    {/* New Users */}
                    {newUsers.length > 0 && (
                      <div className="p-4 border-b">
                        <h3 className="font-medium text-gray-900 mb-3">New Users</h3>
                        {newUsers.map((user) => (
                          <div
                            key={user._id}
                            className="p-3 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3"
                            onClick={() => handleSelectChat({ user })}
                          >
                            <div className="relative">
                              {user.profileImageUrl ? (
                                <img
                                  src={getUserProfileImageUrl(user)}
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
                          </div>
                        ))}
                      </div>
                    )}

                    {/* All Conversations */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Recent Conversations</h3>
                      {conversations.length > 0 ? (
                        conversations.map((conv) => (
                          <div
                            key={conv.user._id}
                            className={`p-3 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                              selectedChat?.user._id === conv.user._id
                                ? "bg-blue-50 border-l-4 border-l-blue-600"
                                : "border-l-4 border-l-transparent hover:bg-gray-50"
                            }`}
                            onClick={() => handleSelectChat(conv)}
                          >
                            <div className="flex items-center gap-3">
                              {conv.user.profileImageUrl ? (
                                <img
                                  src={getUserProfileImageUrl(conv.user)}
                                  alt={conv.user.name}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(conv.user.name)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">
                                  {conv.user.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {conv.user.email}
                                </p>
                              </div>
                              {selectedChat?.type === "user" &&
                                selectedChat?.id === conv.user._id && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent conversations</p>
                      )}
                    </div>
                  </>
                </>
              ) : (
                <>
                  {/* Conversations List */}
                  {searchTerm ? (
                    <>
                      {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                          <div
                            key={conv.user._id}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                              selectedChat?.user._id === conv.user._id
                                ? "bg-blue-50 border-l-4 border-l-blue-600"
                                : "border-l-4 border-l-transparent hover:bg-gray-50"
                            }`}
                            onClick={() => handleSelectChat(conv)}
                          >
                            <div className="relative">
                              {conv.user.profileImageUrl ? (
                                <img
                                  src={getUserProfileImageUrl(conv.user)}
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
                              <p className="font-medium text-gray-900 text-sm">
                                {conv.user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {conv.user.email}
                              </p>
                            </div>
                            {selectedChat?.type === "user" &&
                              selectedChat?.id === conv.user._id && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <p>No conversations found</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {conversations.map((conv) => (
                        <div
                          key={conv.user._id}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                            selectedChat?.user._id === conv.user._id
                              ? "bg-blue-50 border-l-4 border-l-blue-600"
                              : "border-l-4 border-l-transparent hover:bg-gray-50"
                          }`}
                          onClick={() => handleSelectChat(conv)}
                        >
                          <div className="relative">
                            {conv.user.profileImageUrl ? (
                              <img
                                src={getUserProfileImageUrl(conv.user)}
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
                            <p className="font-medium text-gray-900 text-sm">
                              {conv.user.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {conv.user.email}
                            </p>
                          </div>
                          {selectedChat?.type === "user" &&
                            selectedChat?.id === conv.user._id && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Empty State */}
                  {!searchTerm && conversations.length === 0 && (
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
                      {selectedChat.user.profileImageUrl ? (
                        <img
                          src={getUserProfileImageUrl(selectedChat.user)}
                          alt={selectedChat.user.name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                          {getInitials(selectedChat.user.name)}
                        </div>
                      )}
                      {/* Online/Offline Status for chat header */}
                      <div
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isUserOnline(selectedChat.user._id)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">
                        {selectedChat.user.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {isUserOnline(selectedChat.user._id)
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
                    messages[selectedChat.user._id]?.map((msg) => {
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
                                src={getUserProfileImageUrl(msg.sender)}
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
                                        <img
                                          src={`${BASE_URL}${msg.fileUrl}`}
                                          alt={msg.fileName}
                                          className="max-w-[120px] max-h-32 rounded-lg object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder-image.jpg'; // fallback image
                                          }}
                                        />
                                      ) : (
                                        // Non-image file - show as attachment
                                        <a 
                                          href={`${BASE_URL}${msg.fileUrl}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-col gap-1"
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
                                        </a>
                                      )
                                    ) : (
                                      <p className="text-sm">{msg.content}</p>
                                    )}
                                  </div>
                                  <p
                                    className={`text-xs mt-1 ${
                                      isCurrentUser
                                        ? "text-blue-100 text-right"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                {isCurrentUser && (
                                  <div className="mt-1">
                                    <LuEllipsisVertical
                                      className="text-gray-400 cursor-pointer hover:text-gray-600"
                                      onClick={(e) =>
                                        handleContextMenu(e, msg._id, true)
                                      }
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div
                                className={`px-4 py-2.5 rounded-2xl max-w-md text-sm italic ${
                                  isCurrentUser
                                    ? "bg-blue-500/20 text-gray-500 rounded-tr-sm"
                                    : "bg-gray-100/50 text-gray-500 rounded-tl-sm"
                                }`}
                              >
                                Message deleted
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No messages yet</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-6 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, selectedChat.user._id)}
                    />
                    <button
                      onClick={() => sendMessage(selectedChat.user._id)}
                      disabled={!newMessage.trim()}
                      className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LuSend className="text-lg" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                    <LuSend className="text-3xl text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-gray-500 max-w-md">
                    Select a conversation from the list or search for a user to start messaging.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu.visible && contextMenu.canDelete && (
          <div
            className="absolute bg-white border border-gray-200 rounded-md shadow-lg z-20"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-red-50 text-red-600"
              onClick={() => {
                deleteMessage(contextMenu.messageId);
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <LuTrash2 className="text-sm" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingModal;








