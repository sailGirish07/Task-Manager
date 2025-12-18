import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
// import { LuFileSpreadsheet } from "react-icons/lu";
// import TaskListTable from "../../components/TaskListTable";
// import toast from "react-hot-toast";

export default function MyTask() {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");

  const navigate = useNavigate();

  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_ALL_TASKS,
        {
          params: {
            status: filterStatus === "All" ? "" : filterStatus,
          },
        }
      );

      setAllTasks(
        response.data?.tasks?.length > 0 ? response.data.tasks : []
      );

      const statusSummary = response.data?.statussummary || {};
      const statusArray = [
        { label: "All", count: statusSummary.all || 0 },
        { label: "Pending", count: statusSummary.pending || 0 },
        { label: "In Progress", count: statusSummary.inProgress || 0 },
        { label: "Completed", count: statusSummary.completed || 0 },
      ];

      setTabs(statusArray);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };


  const handleClick = (taskId) => {
    navigate(`/user/task-details/${taskId}`);
      // state: { taskId: taskData._id },
    
  };

  // Download task report
  // const handleDownloadReport = async () => {
  //   try {
  //     const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_TASKS, {
  //       responseType: "blob",
  //     });

  //     //Create a URL for the blob
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.setAttribute("download", "task_details.xlsx");
  //     document.body.appendChild(link);
  //     link.click();
  //     link.parentNode.removeChild(link);
  //     window.URL.revokeObjectURL(url);
  //   } catch (err) {
  //     console.error("Error downloading task report:", err);
  //     toast.error("Failed to download expense details. Please try again")
  //   }
  // };

  useEffect(() => {
    getAllTasks();
  }, [filterStatus]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="my-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between">
          {/* <div className="flex items-center justify-between gap-3"> */}
            <h2 className="text-xl md:text-xl font-medium">
              My Tasks
            </h2>
            {/* <button
              className="flex lg:hidden download-btn"
            onClick={handleDownloadReport}
            >
              <LuFileSpreadsheet className="text-lg"/>
              Download Report
            </button> 
           </div> 

          {allTasks?.length > 0 && ( */}
          {tabs?.[0]?.count > 0 && (
            // <div className="flex items-center gap-3">
              <TaskStatusTabs
              tabs={tabs}
              activeTab={filterStatus}
              setActiveTab={setFilterStatus}
            />
             )}
          </div>
            {/* <button className="hidden lg:flex download-btn " onClick={handleDownloadReport}>
            <LuFileSpreadsheet className="text-lg"/>
            Download Report
            </button> 
          )} */}
        </div>
         

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {allTasks?.map ((item, index) => {
              <TaskCard
              key={item._id}
              title={item.title}
              decription={item.description}
              priority={item.priority}
              status={item.status}
              progress={item.progress}
              createdAt={item.createdAt}
              dueDate={item.dueDate}
              assignedTo={item.assignedTo?.map((item) => item.profileImageUrl)}
              attachmentCount={item.attachments?.length || 0}
              completedTodoCount={item.completedTodoCount || 0}
              todoChecklist={item.todoChecklist || []}
              onClick={() => {
                handleClick(item._id)
              }}
              />
            })}
          </div>
      {/* </div> */}
    </DashboardLayout>
  );
}

