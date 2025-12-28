import React from "react";

export default function AvatarGroup({ avatars, maxVisible = 3 }) {
  return (
    <div className="flex items-center">
      {avatars.slice(0, maxVisible).map((avatar, index) =>
        avatar ? (
          <img
            key={index}
            src={avatar}
            alt={`Avatar ${index}`}
            className="w-9 h-9 rounded-full border-2 border-white -ml-3 first:ml-0"
          />
        ) : (
          <div
            key={index}
            className="w-9 h-9 rounded-full border-2 border-white -ml-3 first:ml-0 bg-gray-200 flex items-center justify-center"
          >
            <span className="text-gray-500 text-xs">U</span>
          </div>
        )
      )}
      {avatars.length > maxVisible && (
        <div className="w-9 h-9 flex items-center justify-center bg-blue-50 text-sm font-medium rounded-full border-2 border-white -ml-3">
          +{avatars.length - maxVisible}
        </div>
      )}
    </div>
  );
}
