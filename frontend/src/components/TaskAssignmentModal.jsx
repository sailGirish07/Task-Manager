import React from "react";
import { LuX, LuUser } from "react-icons/lu";

const TaskAssignmentModal = ({ isOpen, onClose }) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-lime-300 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl h-3/4 flex flex-col border-2 border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Messages</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <LuX className="text-xl" />
          </button>
        </div>



        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="p-4">
            {/* Content will be loaded based on active tab */}
            <div className="text-center text-gray-500 py-8">
              Search for users to message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentModal;
