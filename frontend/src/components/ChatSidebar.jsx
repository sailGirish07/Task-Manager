import { useState, useEffect } from "react";
import { LuMessageSquare, LuX, LuSend } from "react-icons/lu";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { socket } from "../components/utils/socket";

const ChatSidebar = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // {type: 'direct', id: userId}
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const activeTab = "direct"; // Only direct messaging now

  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_CONVERSATIONS
      );
      setConversations(response.data.conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };



  const fetchMessages = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
      );
      setMessages(response.data.messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Fetch conversations
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat]);

  // Handle profile updates
  useEffect(() => {
    const handleProfileUpdate = (data) => {
      // Update conversations with new profile image
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv.user._id === data.userId
            ? {
                ...conv,
                user: {
                  ...conv.user,
                  profileImageUrl: data.profileImageUrl,
                  name: data.name,
                },
              }
            : conv
        )
      );

      // Update messages if the sender is the updated user
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message.sender._id === data.userId
            ? {
                ...message,
                sender: {
                  ...message.sender,
                  profileImageUrl: data.profileImageUrl,
                  name: data.name,
                },
              }
            : message
        )
      );
    };

    const handleWindowProfileUpdate = (e) => {
      handleProfileUpdate(e.detail);
    };

    // Also refresh conversations to ensure latest data
    const handleProfileUpdateAndRefresh = (data) => {
      handleProfileUpdate(data);
      fetchConversations();
    };

    socket.on("profileUpdated", handleProfileUpdateAndRefresh);
    window.addEventListener("profileUpdated", handleWindowProfileUpdate);

    return () => {
      socket.off("profileUpdated", handleProfileUpdateAndRefresh);
      window.removeEventListener("profileUpdated", handleWindowProfileUpdate);
    };
  }, [fetchConversations]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const messageData = {
        content: newMessage,
        messageType: "text",
      };

      messageData.recipientId = selectedChat.id;
      await axiosInstance.post(
        API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE,
        messageData
      );

      setNewMessage("");
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg z-50 transform transition-transform">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Messages</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <LuX className="text-xl" />
          </button>
        </div>



        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedChat ? (
          /* Chat View */
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
                {conversations.find((c) => c.user._id === selectedChat.id)
                  ?.user.profileImageUrl ? (
                  <img
                    src={
                      conversations.find(
                        (c) => c.user._id === selectedChat.id
                      )?.user.profileImageUrl
                    }
                    alt={
                      conversations.find(
                        (c) => c.user._id === selectedChat.id
                      )?.user.name
                    }
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {conversations
                        .find((c) => c.user._id === selectedChat.id)
                        ?.user.name.charAt(0)
                        .toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-gray-900">
                    {conversations.find((c) => c.user._id === selectedChat.id)
                      ?.user.name || "User"}
                  </h4>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
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
                          src={message.sender.profileImageUrl}
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
                        : "bg-gray-100 text-gray-800"
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
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LuSend className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Chat List View */
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
                <div
                  key={conv.user._id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedChat?.id === conv.user._id
                      ? "bg-blue-50"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedChat({ id: conv.user._id })
                  }
                >
                  <div className="flex items-center gap-3">
                    {conv.user.profileImageUrl ? (
                      <img
                        src={conv.user.profileImageUrl}
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
                        <h4 className="font-medium text-gray-900 truncate">
                          {conv.user.name}
                        </h4>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
