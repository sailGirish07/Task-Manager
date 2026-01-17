import React from "react";
import { LuX, LuUser, LuSearch } from "react-icons/lu";

const TaskAssignmentModal = ({ isOpen, onClose }) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl h-3/4 flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <LuUser className="text-blue-600" />
            Assign Task
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <LuX className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b">
            <div className="relative">
              <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users to assign..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-4">
            <div className="text-center text-gray-500 py-8">
              <LuUser className="mx-auto text-4xl mb-3 text-gray-300" />
              <p className="font-medium">No users selected</p>
              <p className="text-sm mt-1">Search and select users to assign this task</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            disabled
          >
            Assign Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentModal;