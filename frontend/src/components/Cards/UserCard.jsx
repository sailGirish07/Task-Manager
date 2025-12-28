import React from "react";

export default function UserCard({ userInfo }) {
  return (
    <div className="user-card p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {userInfo?.profileImageUrl ? (
            <img
              src={userInfo?.profileImageUrl}
              alt={"Avatar"}
              className="w-12 h-12 rounded-full border-2 border-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">
                {userInfo?.name?.charAt(0) || "U"}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{userInfo?.name}</p>
            <p className="text-xs text-gray-500">{userInfo?.email}</p>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-3 mt-5">
        <StatCard
          label="Pending"
          count={userInfo?.pendingTasks || 0}
          status="pending"
        />

        <StatCard
          label="In Progress"
          count={userInfo?.inProgressTasks || 0}
          status="inProgress"
        />

        <StatCard
          label="Completed"
          count={userInfo?.completedTasks || 0}
          status="completed"
        />
      </div>
    </div>
  );
}

const StatCard = ({ label, count, status }) => {
  const getStatusTagColor = () => {
    switch (status) {
      case "inProgress":
        return "text-cyan-500 bg-gray-50";

      case "completed":
        return "text-indigo-500 bg-lime-50";

      default:
        return "text-violet-500 bg-violet-50";
    }
  };

  return (
    <div
      className={`flex-1 text-[10px] font-medium ${getStatusTagColor()} px-4 py-0.5 rounded`}
    >
      <span className="text-[12px] font-semibold">{count}</span> {label}
    </div>
  );
};
