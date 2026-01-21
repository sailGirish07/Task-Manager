import React, { useState, useEffect, useRef } from 'react';
import { LuMessageSquare, LuSend, LuPaperclip } from 'react-icons/lu';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { socket } from '../utils/socket';
import { getUserProfileImageUrl } from '../../utils/imageUtils';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // {type: 'direct', id: userId}
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  
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



  const fetchMessages = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
      );
      setMessages(response.data.messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

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
      fetchConversations();
    };
    
    socket.on('profileUpdated', handleProfileUpdateAndRefresh);
    window.addEventListener('profileUpdated', handleWindowProfileUpdate);
    
    return () => {
      socket.off('profileUpdated', handleProfileUpdateAndRefresh);
      window.removeEventListener('profileUpdated', handleWindowProfileUpdate);
    };
  }, [fetchConversations]);


  const sendMessage = async (fileToSend = null) => {
    if ((!newMessage.trim() && !fileToSend) || !selectedChat) return;

    try {
      const formData = new FormData();
      formData.append('messageType', fileToSend ? 'file' : 'text');
      
      if (newMessage.trim()) {
        formData.append('content', newMessage);
      }
      
      if (fileToSend) {
        formData.append('file', fileToSend);
      }

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

      setNewMessage('');
      setSelectedFile(null);
      setIsUploading(false);
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
      // Ensure upload state is reset on error
      setIsUploading(false);
    }
  };
  

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add a small delay to ensure event propagation is stopped
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size exceeds 10MB limit');
        return;
      }
      setSelectedFile(file);
      setIsUploading(false); // Don't auto-upload
      setUploadProgress(0); // Reset progress
      // Don't send immediately - wait for user to click send button
    }
  };

  // Handle file download/open with authentication
  const handleFileDownload = (e, fileMessage) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    const filename = fileMessage.fileUrl.split('/').pop(); // Extract filename from path
    
    // Create a download link with token as query parameter
    const downloadUrl = `${API_PATHS.BASE_URL}/api/messages/files/${filename}?token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  // Handle image view with authentication
  const handleImageView = (imageUrl) => {
    const token = localStorage.getItem('accessToken');
    const filename = imageUrl.split('/').pop(); // Extract filename from path
    
    // Return URL with token for authenticated image viewing
    return `${API_PATHS.BASE_URL}/api/messages/images/${filename}?token=${token}`;
  };

  return (
    <div className="flex h-full bg-white rounded-lg shadow-sm border">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex gap-2 mb-4">
            <button
              className={`py-2 px-4 rounded-lg text-sm font-medium bg-blue-100 text-blue-700`}
            >
              <LuMessageSquare className="inline mr-2" />
              Direct
            </button>
          </div>
          

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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations
            .filter(conv => 
              conv.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((conv) => (
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
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <>
                  {conversations.find(c => c.user._id === selectedChat.id)?.user.profileImageUrl ? (
                    <img
                      src={getUserProfileImageUrl(conversations.find(c => c.user._id === selectedChat.id)?.user)}
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
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender._id === localStorage.getItem('userId')
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >

                    {message.messageType === 'file' ? (
                      message.fileType?.startsWith('image/') ? (
                        // Image file - show directly
                        <img
                          src={handleImageView(message.fileUrl)}
                          alt={message.fileName}
                          className="max-w-[120px] max-h-32 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-image.jpg'; // fallback image
                          }}
                        />
                      ) : (
                        // Non-image file - show as attachment
                        <div 
                          onClick={(e) => handleFileDownload(e, message)}
                          className="flex flex-col gap-1 cursor-pointer"
                        >
                          <div className="flex items-start gap-2 p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center bg-gray-100">
                              {message.fileType === 'application/pdf' ? (
                                <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : message.fileType?.includes('document') || message.fileType?.includes('wordprocessing') ? (
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : message.fileType?.includes('zip') || message.fileType?.includes('compressed') ? (
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
                              <div className="font-medium text-xs truncate">{message.fileName}</div>
                              <div className="text-[10px] text-gray-500">
                                {`${message.fileSize > 1024 * 1024 
                                  ? `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB` 
                                  : `${(message.fileSize / 1024).toFixed(1)} KB`} • ${message.fileType}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFileUpload(e);
                    }}
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
                    onClick={() => {
                      if (selectedFile) {
                        setIsUploading(true);
                        sendMessage(selectedFile);
                      } else {
                        sendMessage();
                      }
                    }}
                    disabled={!newMessage.trim() && !selectedFile}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LuSend className="text-lg" />
                  </button>
                </div>
                {selectedFile && (
                  <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                        <div className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedFile(null);
                          setIsUploading(false);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <LuMessageSquare className="mx-auto text-4xl mb-2" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>


      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        onClick={(e) => e.stopPropagation()}
        accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
        multiple
      />
    </div>
  );
};

export default Chat;