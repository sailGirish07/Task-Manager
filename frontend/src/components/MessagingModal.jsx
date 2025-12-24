// import { useState, useEffect } from 'react';
// import { LuX, LuUser, LuUsers, LuSearch, LuSend } from 'react-icons/lu';
// import axiosInstance from '../utils/axiosInstance';
// import { API_PATHS } from '../utils/apiPaths';

// const MessagingModal = ({ isOpen, onClose }) => {
//   const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'groups'
//   const [users, setUsers] = useState([]);
//   const [groups, setGroups] = useState([]);
//   const [conversations, setConversations] = useState([]);
//   const [selectedChat, setSelectedChat] = useState(null); // {type: 'user' or 'group', id, name}
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [showCreateGroup, setShowCreateGroup] = useState(false);
//   const [createGroupData, setCreateGroupData] = useState({ name: '', description: '', members: [] });

//   // Fetch initial data
//   useEffect(() => {
//     if (isOpen) {
//       fetchUsers();
//       fetchGroups();
//       fetchConversations();
//     }
//   }, [isOpen]);

//   // Fetch messages when a chat is selected
//   useEffect(() => {
//     if (selectedChat) {
//       fetchMessages();
//     }
//   }, [selectedChat]);

//   const fetchUsers = async () => {
//     try {
//       const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
//       setUsers(response.data.users);
//     } catch (error) {
//       console.error('Error fetching users:', error);
//     }
//   };

//   const fetchGroups = async () => {
//     try {
//       const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_GROUPS);
//       setGroups(response.data.groups);
//     } catch (error) {
//       console.error('Error fetching groups:', error);
//     }
//   };

//   const fetchConversations = async () => {
//     try {
//       const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_CONVERSATIONS);
//       setConversations(response.data.conversations);
//     } catch (error) {
//       console.error('Error fetching conversations:', error);
//     }
//   };

//   const fetchMessages = async () => {
//     try {
//       let response;
//       if (selectedChat.type === 'user') {
//         response = await axiosInstance.get(
//           API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
//         );
//       } else {
//         response = await axiosInstance.get(
//           API_PATHS.MESSAGES.GET_GROUP_MESSAGES(selectedChat.id)
//         );
//       }
//       setMessages(response.data.messages.reverse());
//     } catch (error) {
//       console.error('Error fetching messages:', error);
//     }
//   };

//   const sendMessage = async () => {
//     if (!newMessage.trim() || !selectedChat) return;

//     try {
//       const messageData = {
//         content: newMessage,
//         messageType: 'text'
//       };

//       if (selectedChat.type === 'user') {
//         messageData.recipientId = selectedChat.id;
//         await axiosInstance.post(API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE, messageData);
//       } else {
//         messageData.groupId = selectedChat.id;
//         await axiosInstance.post(API_PATHS.MESSAGES.SEND_GROUP_MESSAGE, messageData);
//       }

//       setNewMessage('');
//       fetchMessages(); // Refresh messages
//     } catch (error) {
//       console.error('Error sending message:', error);
//     }
//   };

//   const createGroup = async () => {
//     try {
//       await axiosInstance.post(API_PATHS.MESSAGES.CREATE_GROUP, createGroupData);
//       setShowCreateGroup(false);
//       setCreateGroupData({ name: '', description: '', members: [] });
//       fetchGroups(); // Refresh groups
//     } catch (error) {
//       console.error('Error creating group:', error);
//     }
//   };

//   const addMemberToGroup = async (groupId, userId) => {
//     try {
//       await axiosInstance.put(API_PATHS.MESSAGES.ADD_MEMBER_TO_GROUP(groupId, userId));
//       fetchGroups(); // Refresh groups
//     } catch (error) {
//       console.error('Error adding member to group:', error);
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   const filteredUsers = users?.filter(user =>
//     user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     user.email.toLowerCase().includes(searchTerm.toLowerCase())
//   ) || [];

//   const filteredGroups = groups?.filter(group =>
//     group.name.toLowerCase().includes(searchTerm.toLowerCase())
//   ) || [];

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-3/4 flex flex-col">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-lg font-medium">Messages</h3>
//           <button 
//             onClick={onClose} 
//             className="text-gray-500 hover:text-gray-700"
//           >
//             <LuX className="text-xl" />
//           </button>
//         </div>

//         {/* Tabs for Personal and Groups */}
//         <div className="flex gap-2 mb-4">
//           <button 
//             className={`px-4 py-2 rounded-lg font-medium ${
//               activeTab === 'personal' 
//                 ? 'bg-blue-100 text-blue-700' 
//                 : 'text-gray-600 hover:bg-gray-100'
//             }`}
//             onClick={() => setActiveTab('personal')}
//           >
//             <LuUser className="inline mr-2" />
//             Personal
//           </button>
//           <button 
//             className={`px-4 py-2 rounded-lg font-medium ${
//               activeTab === 'groups' 
//                 ? 'bg-blue-100 text-blue-700' 
//                 : 'text-gray-600 hover:bg-gray-100'
//             }`}
//             onClick={() => setActiveTab('groups')}
//           >
//             <LuUsers className="inline mr-2" />
//             Groups
//           </button>
//         </div>

//         <div className="flex flex-1 overflow-hidden">
//           {/* Sidebar - Conversations list */}
//           <div className="w-1/3 border-r flex flex-col">
//             <div className="p-3 border-b">
//               <div className="relative">
//                 <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//                 <input 
//                   type="text" 
//                   placeholder={activeTab === 'personal' ? "Search users..." : "Search groups..."} 
//                   className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                 />
//               </div>
              
//               {activeTab === 'groups' && (
//                 <button 
//                   className="w-full mt-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
//                   onClick={() => setShowCreateGroup(true)}
//                 >
//                   Create Group
//                 </button>
//               )}
//             </div>
            
//             <div className="flex-1 overflow-y-auto">
//               {activeTab === 'personal' ? (
//                 filteredUsers.map(user => (
//                   <div 
//                     key={user._id}
//                     className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
//                       selectedChat?.type === 'user' && selectedChat?.id === user._id ? 'bg-blue-50' : ''
//                     }`}
//                     onClick={() => setSelectedChat({ type: 'user', id: user._id, name: user.name })}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
//                         <span className="text-sm font-medium text-white">
//                           {user.name.charAt(0).toUpperCase()}
//                         </span>
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <h4 className="font-medium text-gray-900 truncate">{user.name}</h4>
//                         <p className="text-sm text-gray-500 truncate">{user.email}</p>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 filteredGroups?.map(group => (
//                   <div 
//                     key={group._id}
//                     className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
//                       selectedChat?.type === 'group' && selectedChat?.id === group._id ? 'bg-blue-50' : ''
//                     }`}
//                     onClick={() => setSelectedChat({ type: 'group', id: group._id, name: group.name })}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
//                         <LuUsers className="text-white" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <h4 className="font-medium text-gray-900 truncate">{group.name}</h4>
//                         <p className="text-sm text-gray-500">{group.members.length} members</p>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
          
//           {/* Main chat area */}
//           <div className="flex-1 flex flex-col">
//             {selectedChat ? (
//               <>
//                 <div className="p-3 border-b">
//                   <h4 className="font-medium text-gray-900">{selectedChat.name}</h4>
//                   <p className="text-sm text-gray-500">
//                     {selectedChat.type === 'user' ? 'Online' : `${groups?.find(g => g._id === selectedChat.id)?.members.length || 0} members`}
//                   </p>
//                 </div>
                
//                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
//                   {messages?.length > 0 ? (
//                     messages?.map((message) => (
//                       <div
//                         key={message._id}
//                         className={`flex ${message.sender._id === localStorage.getItem('userId') ? 'justify-end' : 'justify-start'}`}
//                       >
//                         <div
//                           className={`max-w-xs px-4 py-2 rounded-lg ${
//                             message.sender._id === localStorage.getItem('userId')
//                               ? 'bg-blue-500 text-white'
//                               : 'bg-gray-100 text-gray-800'
//                           }`}
//                         >
//                           <p className="text-sm">{message.content}</p>
//                           <p className={`text-xs mt-1 ${
//                             message.sender._id === localStorage.getItem('userId') 
//                               ? 'text-blue-100' 
//                               : 'text-gray-500'
//                           }`}>
//                             {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                           </p>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-center text-gray-500 py-4">No messages yet</p>
//                   )}
//                 </div>
                
//                 <div className="p-3 border-t">
//                   <div className="flex items-center gap-2">
//                     <input 
//                       type="text" 
//                       placeholder="Type a message..." 
//                       className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       value={newMessage}
//                       onChange={(e) => setNewMessage(e.target.value)}
//                       onKeyPress={handleKeyPress}
//                     />
//                     <button 
//                       onClick={sendMessage}
//                       disabled={!newMessage.trim()}
//                       className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       <LuSend className="text-lg" />
//                     </button>
//                   </div>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div className="p-3 border-b">
//                   <h4 className="font-medium text-gray-900">Select a conversation</h4>
//                   <p className="text-sm text-gray-500">Choose a conversation to start messaging</p>
//                 </div>
                
//                 <div className="flex-1 flex items-center justify-center">
//                   <div className="text-center text-gray-500">
//                     <LuUser className="mx-auto text-4xl mb-2" />
//                     <p>Select a user or group to start messaging</p>
//                   </div>
//                 </div>
                
//                 <div className="p-3 border-t">
//                   <div className="flex items-center gap-2">
//                     <input 
//                       type="text" 
//                       placeholder="Type a message..." 
//                       className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       disabled
//                     />
//                     <button className="p-2 bg-gray-400 text-white rounded-full" disabled>
//                       <LuSend className="text-lg" />
//                     </button>
//                   </div>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Create Group Modal */}
//       {showCreateGroup && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-md">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-lg font-medium">Create Group</h3>
//               <button onClick={() => setShowCreateGroup(false)} className="text-gray-500">
//                 <LuX className="text-xl" />
//               </button>
//             </div>
            
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
//                 <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                   value={createGroupData.name}
//                   onChange={(e) => setCreateGroupData({...createGroupData, name: e.target.value})}
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
//                 <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                   value={createGroupData.description}
//                   onChange={(e) => setCreateGroupData({...createGroupData, description: e.target.value})}
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
//                 <select
//                   multiple
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                   value={createGroupData.members}
//                   onChange={(e) => {
//                     const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
//                     setCreateGroupData({...createGroupData, members: selectedOptions});
//                   }}
//                 >
//                   {users?.filter(user => user._id !== localStorage.getItem('userId')) // Exclude current user
//                     ?.map(user => (
//                       <option key={user._id} value={user._id}>
//                         {user.name} ({user.email})
//                       </option>
//                     ))}
//                 </select>
//               </div>
//             </div>
            
//             <div className="flex gap-2 mt-6">
//               <button
//                 onClick={() => setShowCreateGroup(false)}
//                 className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={createGroup}
//                 className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//               >
//                 Create Group
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MessagingModal;


import { useState, useEffect, useContext } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import { UserContext } from '../context/UserContext';

const MessagingModal = ({ isOpen, onClose }) => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('personal');
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // For group creation
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
  const [showGroupManagement, setShowGroupManagement] = useState(false); // Group management modal

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchGroups();
      fetchAllUsers(); // For group creation only
      checkOnlineStatus(); // Initial check
      
      // Poll online status every 30 seconds
      const intervalId = setInterval(() => {
        checkOnlineStatus();
      }, 30000);
      
      // Cleanup interval on modal close
      return () => clearInterval(intervalId);
    }
  }, [isOpen]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      markMessagesAsRead(); // Mark as read when opening chat
      updateMessageStatusToDelivered(); // Update to delivered if not already
    }
  }, [selectedChat]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_CONVERSATIONS);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS_FOR_MESSAGING);
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
    }
  };

  const checkOnlineStatus = async () => {
    // Fetch real online status from backend
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ONLINE_STATUS);
      const onlineIds = new Set(response.data.onlineUserIds || []);
      setOnlineUsers(onlineIds);
    } catch (error) {
      console.error('Error checking online status:', error);
      // Keep previous state on error
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(API_PATHS.MESSAGES.GET_GROUPS);
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (selectedChat.type === 'user') {
        response = await axiosInstance.get(
          API_PATHS.MESSAGES.GET_DIRECT_MESSAGES(selectedChat.id)
        );
      } else {
        response = await axiosInstance.get(
          API_PATHS.MESSAGES.GET_GROUP_MESSAGES(selectedChat.id)
        );
      }
      setMessages(response.data.messages?.reverse() || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedChat || selectedChat.type !== 'user') return;

    try {
      await axiosInstance.put(API_PATHS.MESSAGES.MARK_MESSAGES_AS_READ, {
        senderId: selectedChat.id
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const updateMessageStatusToDelivered = async () => {
    if (!selectedChat || selectedChat.type !== 'user') return;

    try {
      await axiosInstance.put(API_PATHS.MESSAGES.UPDATE_MESSAGE_STATUS, {
        senderId: selectedChat.id
      });
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await axiosInstance.delete(API_PATHS.MESSAGES.DELETE_MESSAGE(messageId));
      // Refresh messages
      await fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setError(null);
      const messageData = {
        content: newMessage,
        messageType: 'text'
      };

      if (selectedChat.type === 'user') {
        messageData.recipientId = selectedChat.id;
        await axiosInstance.post(API_PATHS.MESSAGES.SEND_DIRECT_MESSAGE, messageData);
      } else {
        messageData.groupId = selectedChat.id;
        await axiosInstance.post(API_PATHS.MESSAGES.SEND_GROUP_MESSAGE, messageData);
      }

      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await axiosInstance.post(API_PATHS.MESSAGES.CREATE_GROUP, {
        name: groupName,
        description: groupDescription,
        memberIds: selectedMembers,
      });
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      await fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || '?';
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
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      // Show date for older messages
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations?.filter(conv =>
    conv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter all users for starting new conversations
  const filteredAllUsers = allUsers?.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get user IDs already in conversations to avoid duplicates
  const conversationUserIds = new Set(conversations?.map(conv => conv.user._id) || []);
  
  // Users not in conversations yet (for new conversations)
  const newUsers = filteredAllUsers.filter(u => !conversationUserIds.has(u._id));

  const filteredGroups = groups?.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/50" style={{ margin: 0, padding: '1rem' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: '85vh', maxHeight: '90vh' }}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* SIDEBAR */}
          <div className="w-[340px] border-r flex flex-col h-full">
            
            {/* Tabs */}
            <div className="flex gap-0 px-5 py-5 border-b">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'personal'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Personal
              </button>

              <button
                onClick={() => setActiveTab('groups')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'groups'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Groups
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-4 border-b">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={activeTab === 'personal' ? "Search users to message..." : "Search groups..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <p className="text-xs text-gray-500 mt-2">
                  {activeTab === 'personal' 
                    ? `Found ${filteredConversations.length + newUsers.length} result(s)` 
                    : `Found ${filteredGroups.length} group(s)`}
                </p>
              )}
              {activeTab === 'groups' && (
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full mt-3 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Group
                </button>
              )}
            </div>

            {/* User/Group List */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              {activeTab === 'personal' ? (
                <>
                  {/* Existing Conversations */}
                  {filteredConversations.length > 0 && (
                    <>
                      {searchTerm && <div className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Conversations</div>}
                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.user._id}
                          onClick={() => {
                            setSelectedChat({ type: 'user', id: conv.user._id, name: conv.user.name, email: conv.user.email });
                            setSearchTerm('');
                          }}
                          className={`px-5 py-4 cursor-pointer transition-all duration-200 ${
                            selectedChat?.type === 'user' && selectedChat?.id === conv.user._id
                              ? 'bg-blue-50 border-l-4 border-l-blue-600'
                              : 'border-l-4 border-l-transparent hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {getInitials(conv.user.name)}
                              </div>
                              {/* Online/Offline Status Indicator */}
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                isUserOnline(conv.user._id) ? 'bg-green-500' : 'bg-gray-300'
                              }`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 text-sm">{conv.user.name}</p>
                                <span className="text-xs text-gray-400">
                                  {new Date(conv.lastMessageAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                            </div>
                            {selectedChat?.type === 'user' && selectedChat?.id === conv.user._id && (
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
                      <div className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">New Conversation</div>
                      {newUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => {
                            setSelectedChat({ type: 'user', id: user._id, name: user.name, email: user.email });
                            setSearchTerm('');
                          }}
                          className={`px-5 py-4 cursor-pointer transition-all duration-200 ${
                            selectedChat?.type === 'user' && selectedChat?.id === user._id
                              ? 'bg-blue-50 border-l-4 border-l-blue-600'
                              : 'border-l-4 border-l-transparent hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {getInitials(user.name)}
                              </div>
                              {/* Online/Offline Status Indicator */}
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                isUserOnline(user._id) ? 'bg-green-500' : 'bg-gray-300'
                              }`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            {selectedChat?.type === 'user' && selectedChat?.id === user._id && (
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
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>No conversations yet</p>
                      <p className="text-xs mt-1">Search for users to start messaging</p>
                    </div>
                  )}

                  {/* No Results */}
                  {searchTerm && filteredConversations.length === 0 && newUsers.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p>No users found</p>
                    </div>
                  )}
                </>
              ) : (
                filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={group._id}
                      onClick={() => {
                        setSelectedChat({ type: 'group', id: group._id, name: group.name });
                        setSearchTerm(''); // Clear search after selection
                      }}
                      className={`px-5 py-4 cursor-pointer transition-all duration-200 ${
                        selectedChat?.type === 'group' && selectedChat?.id === group._id
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : 'border-l-4 border-l-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {getInitials(group.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{group.name}</p>
                          <p className="text-xs text-gray-500">{group.members?.length || 0} members</p>
                        </div>
                        {selectedChat?.type === 'group' && selectedChat?.id === group._id && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>{searchTerm ? 'No groups found' : 'Search for groups to message'}</p>
                  </div>
                )
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
                      {selectedChat.type === 'user' && (
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isUserOnline(selectedChat.id) ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">
                        {selectedChat.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {selectedChat.type === 'user' 
                          ? (isUserOnline(selectedChat.id) ? 'Online' : 'Offline')
                          : 'Group chat'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Group Admin Controls */}
                  {selectedChat.type === 'group' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowGroupManagement(true)}
                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
                  {messages.length > 0 ? (
                    messages.map((msg) => {
                      const isCurrentUser = msg.sender?._id === user?._id;
                      const isGroupCreator = groups.some(g => g._id === msg.group && g.createdBy === user?._id);
                      const canDeleteMessage = isCurrentUser || (msg.group && selectedChat?.type === 'group' && isGroupCreator);
                      
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isCurrentUser && (
                            <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-xs mr-2 flex-shrink-0">
                              {getInitials(msg.sender?.name || selectedChat.name)}
                            </div>
                          )}
                          <div
                            className={`flex flex-col ${
                              isCurrentUser ? 'items-end' : 'items-start'
                            }`}
                          >
                            {!msg.isDeleted ? (
                              <>
                                <div
                                  className={`px-4 py-2.5 rounded-2xl max-w-md text-sm ${
                                    isCurrentUser
                                      ? 'bg-blue-500 text-white rounded-tr-sm'
                                      : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                                  }`}
                                >
                                  <div className="flex items-end gap-1.5">
                                    <span>{msg.content}</span>
                                    {isCurrentUser && (
                                      <>
                                        {/* Single tick - sent */}
                                        {msg.status === 'sent' && (
                                          <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {/* Double tick - delivered */}
                                        {msg.status === 'delivered' && (
                                          <div className="flex -space-x-1">
                                            <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                        {/* Double tick green - read */}
                                        {msg.status === 'read' && (
                                          <div className="flex -space-x-1">
                                            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {/* Message timestamp */}
                                <span className={`text-xs mt-1 ${
                                  isCurrentUser ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                              </>
                            ) : (
                              // Show deleted message placeholder
                              <div className="text-xs text-red-500 italic px-4 py-2.5">
                                {msg.deletedBy && msg.deletedBy._id === user._id 
                                  ? 'You deleted this message' 
                                  : `${msg.sender?.name} deleted this message`}
                              </div>
                            )}
                            {/* Delete button for own messages or group admin */}
                            {!msg.isDeleted && canDeleteMessage && (
                              <button
                                onClick={() => deleteMessage(msg._id)}
                                className="text-xs mt-1 text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-400 mt-8">No messages yet</p>
                  )}
                </div>

                {/* Message Input */}
                <div className="px-6 py-4 border-t flex gap-3 items-center">
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
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
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[100000] flex items-center justify-center bg-black/60" style={{ margin: 0, padding: '1rem' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create New Group</h3>
              <button 
                onClick={() => {
                  setShowCreateGroup(false);
                  setGroupName('');
                  setGroupDescription('');
                  setSelectedMembers([]);
                  setError(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Group Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
                <textarea
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter group description"
                  rows={2}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Add Members * ({selectedMembers.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {allUsers.map(user => (
                    <div
                      key={user._id}
                      onClick={() => toggleMemberSelection(user._id)}
                      className={`px-3 py-2.5 cursor-pointer transition-colors ${
                        selectedMembers.includes(user._id)
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedMembers.includes(user._id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedMembers.includes(user._id) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-xs">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowCreateGroup(false);
                  setGroupName('');
                  setGroupDescription('');
                  setSelectedMembers([]);
                  setError(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={loading || !groupName.trim() || selectedMembers.length === 0}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupManagement && selectedChat && selectedChat.type === 'group' && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[100001] flex items-center justify-center bg-black/60" style={{ margin: 0, padding: '1rem' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Manage Group</h3>
              <button 
                onClick={() => setShowGroupManagement(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Group Members</h4>
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {groups.find(g => g._id === selectedChat.id)?.members?.map(memberId => {
                    const member = allUsers.find(u => u._id === memberId);
                    if (!member) return null;
                    
                    const isCurrentUser = member._id === user._id;
                    const isAdmin = groups.find(g => g._id === selectedChat.id)?.admins?.includes(member._id);
                    const isGroupCreator = groups.find(g => g._id === selectedChat.id)?.createdBy === member._id;
                    
                    return (
                      <div key={member._id} className="px-3 py-2.5 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-xs">
                              {getInitials(member.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{groups.find(g => g._id === selectedChat.id)?.createdBy === member._id ? 'Creator' : 'Member'}</p>
                            </div>
                          </div>
                          
                          {/* Remove button for group creator only (but not for themselves) */}
                          {user && groups.find(g => g._id === selectedChat.id)?.createdBy === user._id && 
                           groups.find(g => g._id === selectedChat.id)?.createdBy !== member._id && 
                           member._id !== user._id && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
                                  try {
                                    await axiosInstance.delete(
                                      API_PATHS.MESSAGES.REMOVE_MEMBER_FROM_GROUP(selectedChat.id, member._id)
                                    );
                                    await fetchGroups(); // Refresh groups
                                    await fetchMessages(); // Refresh messages
                                    alert(`${member.name} has been removed from the group`);
                                  } catch (error) {
                                    console.error('Error removing member:', error);
                                    setError('Failed to remove member');
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowGroupManagement(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors"
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

export default MessagingModal;