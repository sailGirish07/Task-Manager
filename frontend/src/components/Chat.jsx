import React, { useState, useEffect, useRef } from 'react';
import { LuSend, LuUsers, LuMessageSquare, LuPlus, LuX, LuPaperclip } from 'react-icons/lu';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import { socket } from '../components/utils/socket';

const Chat = () => {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'groups'
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // {type: 'direct' or 'group', id: userId or groupId}
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [createGroupData, setCreateGroupData] = useState({ name: '', description: '', members: [] });
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_CONVERSATIONS);
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_GROUPS);
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      let response;
      if (selectedChat.type === 'direct') {
        response = await axiosInstance.get(
          API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
        );
      } else {
        response = await axiosInstance.get(
          API_PATHS.MESSAGES.GET_GROUP_MESSAGES(selectedChat.id)
        );
      }
      setMessages(response.data.messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Fetch conversations and groups
  useEffect(() => {
    if (activeTab === 'direct') {
      fetchConversations();
    } else {
      fetchGroups();
    }
  }, [activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat, fetchMessages]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      
      // Update messages if the sender is the updated user
      setMessages(prevMessages => 
        prevMessages.map(message => 
          message.sender._id === data.userId
            ? { ...message, sender: { ...message.sender, profileImageUrl: data.profileImageUrl, name: data.name } }
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
      if (activeTab === 'direct') {
        fetchConversations();
      } else {
        fetchGroups();
      }
    };
    
    socket.on('profileUpdated', handleProfileUpdateAndRefresh);
    window.addEventListener('profileUpdated', handleWindowProfileUpdate);
    
    return () => {
      socket.off('profileUpdated', handleProfileUpdateAndRefresh);
      window.removeEventListener('profileUpdated', handleWindowProfileUpdate);
    };
  }, [activeTab, fetchConversations, fetchGroups]);

  const fetchAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const messageData = {
        content: newMessage,
        messageType: 'text'
      };

      if (selectedChat.type === 'direct') {
        messageData.recipientId = selectedChat.id;
        await axiosInstance.post(API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE, messageData);
      } else {
        messageData.groupId = selectedChat.id;
        await axiosInstance.post(API_PATHS.MESSAGES.SEND_GROUP_MESSAGE, messageData);
      }

      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createGroup = async () => {
    try {
      await axiosInstance.post(API_PATHS.MESSAGES.CREATE_GROUP, createGroupData);
      setShowCreateGroup(false);
      setCreateGroupData({ name: '', description: '', members: [] });
      fetchGroups(); // Refresh groups
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const addMemberToGroup = async (groupId, userId) => {
    try {
      await axiosInstance.put(API_PATHS.MESSAGES.ADD_MEMBER_TO_GROUP(groupId, userId));
      fetchGroups(); // Refresh groups
    } catch (error) {
      console.error('Error adding member to group:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // File upload would be implemented here
      console.log('File selected:', file);
    }
  };

  return (
    <div className="flex h-full bg-white rounded-lg shadow-sm border">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex gap-2 mb-4">
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                activeTab === 'direct'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('direct')}
            >
              <LuMessageSquare className="inline mr-2" />
              Direct
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${
                activeTab === 'groups'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('groups')}
            >
              <LuUsers className="inline mr-2" />
              Groups
            </button>
          </div>
          
          {activeTab === 'groups' && (
            <button
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              onClick={() => {
                setShowCreateGroup(true);
                fetchAllUsers();
              }}
            >
              <LuPlus className="inline mr-2" />
              Create Group
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'direct' ? 'conversations' : 'groups'}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'direct' ? (
            conversations.map((conv) => (
              <div
                key={conv.user._id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedChat?.type === 'direct' && selectedChat?.id === conv.user._id
                    ? 'bg-blue-50'
                    : ''
                }`}
                onClick={() => setSelectedChat({ type: 'direct', id: conv.user._id })}
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
                      <h4 className="font-medium text-gray-900 truncate">{conv.user.name}</h4>
                      {conv.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            groups.map((group) => (
              <div
                key={group._id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedChat?.type === 'group' && selectedChat?.id === group._id
                    ? 'bg-blue-50'
                    : ''
                }`}
                onClick={() => setSelectedChat({ type: 'group', id: group._id })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <LuUsers className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{group.name}</h4>
                    <p className="text-sm text-gray-500">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedChat.type === 'direct' ? (
                  <>
                    {conversations.find(c => c.user._id === selectedChat.id)?.user.profileImageUrl ? (
                      <img
                        src={conversations.find(c => c.user._id === selectedChat.id)?.user.profileImageUrl}
                        alt={conversations.find(c => c.user._id === selectedChat.id)?.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {conversations.find(c => c.user._id === selectedChat.id)?.user.name.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {conversations.find(c => c.user._id === selectedChat.id)?.user.name || 'User'}
                      </h4>
                      <p className="text-sm text-gray-500">Online</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <LuUsers className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {groups.find(g => g._id === selectedChat.id)?.name || 'Group'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {groups.find(g => g._id === selectedChat.id)?.members.length} members
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.sender._id === localStorage.getItem('userId') ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender._id !== localStorage.getItem('userId') && (
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
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender._id === localStorage.getItem('userId')
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.sender._id !== localStorage.getItem('userId') && selectedChat?.type === 'group' && (
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {message.sender.name}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.sender._id === localStorage.getItem('userId') ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFileUpload}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Attach file"
                >
                  <LuPaperclip className="text-lg" />
                </button>
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <LuMessageSquare className="mx-auto text-4xl mb-2" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create Group</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-500">
                <LuX className="text-xl" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={createGroupData.name}
                  onChange={(e) => setCreateGroupData({...createGroupData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={createGroupData.description}
                  onChange={(e) => setCreateGroupData({...createGroupData, description: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={createGroupData.members}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                    setCreateGroupData({...createGroupData, members: selectedOptions});
                  }}
                >
                  {users
                    .filter(user => user._id !== localStorage.getItem('userId')) // Exclude current user
                    .map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple
      />
    </div>
  );
};

export default Chat;