import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import Modal from "../Modal";
import { getUserProfileImageUrl } from "../../utils/imageUtils";

export default function SelectUsers({ selectedUsers, setSelectedUsers }) {
  const [isOpen, setIsOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);

  useEffect(() => {
    setTempSelectedUsers(selectedUsers);
  }, [selectedUsers]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS_FOR_MESSAGING);
        setAllUsers(response.data.users);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const toggleUserSelection = (userId) => {
    setTempSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssign = () => {
    setSelectedUsers(tempSelectedUsers);
    setIsOpen(false);
  };

  const selectedUserImages = allUsers
    .filter((user) => selectedUsers.includes(user._id))
    .map((user) => getUserProfileImageUrl(user));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">Select Users:</span>
        <button
          className="text-primary text-sm underline"
          onClick={() => setIsOpen(true)}
        >
          {selectedUsers.length > 0 ? `(${selectedUsers.length} selected)` : "Select"}
        </button>
      </div>

      {selectedUserImages.length > 0 && (
        <div className="flex gap-2 mb-4">
          {selectedUserImages.slice(0, 5).map((imgUrl, index) => (
            <img
              key={index}
              src={imgUrl}
              alt={`Selected user ${index + 1}`}
              className="w-8 h-8 rounded-full border-2 border-white"
            />
          ))}
          {selectedUserImages.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
              +{selectedUserImages.length - 5}
            </div>
          )}
        </div>
      )}

      <Modal
        title="Select Users"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div className="space-y-4 h-[60vh] overflow-y-auto">
          {allUsers.map((user) => (
            <div
              key={user._id}
              className="flex items-center gap-4 p-3 border-b border-gray-200"
            >
              {user.profileImageUrl ? (
                <img
                  src={getUserProfileImageUrl(user)}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">
                    {user.name.charAt(0)}
                  </span>
                </div>
              )}

              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">
                  {user.name}
                </p>
                <p className="text-[13px] text-gray-500">{user.email}</p>
              </div>

              <input
                type="checkbox"
                checked={tempSelectedUsers.includes(user._id)}
                onChange={() => toggleUserSelection(user._id)}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded-sm outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end ga-4 pt-4">
          <button className="card-btn-fill" onClick={handleAssign}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}