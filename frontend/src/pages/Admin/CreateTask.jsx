import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { PRIORITY_DATA } from "../../utils/data";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { LuTrash, LuTrash2 } from "react-icons/lu";
import SelectDropDown from "../../components/Inputs/SelectDropDown";
import SelectUsers from "../../components/Inputs/SelectUsers";
import TodoListInput from "../../components/Inputs/TodoListInput";
import AddAttachmentsInput from "../../components/Inputs/AddAttachmentsInput";
import DeleteAlert from "../../components/DeleteAlert";
import Modal from "../../components/Modal";


export default function CreateTask() {
  const location = useLocation();
  const { taskId } = location.state || {};
  const navigate = useNavigate();

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "",
    dueDate: "",
    assignedTo: [],
    todoChecklist: [],
    attachments: [],
  });

  const [currentTask, setCurrentTask] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);

  const handleValueChange = (key, value) => {
    setTaskData((prevData) => ({ ...prevData, [key]: value }));
  };

  const clearData = () => {
    setTaskData({
      title: "",
      description: "",
      priority: "Medium",
      dueDate: "",
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
    });
  };

  //Create Task
  const CreateTask = async () => {
   setLoading(true);
      try{
        // Validate date before sending to backend
        const dueDateObj = new Date(taskData.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          throw new Error("Invalid date format");
        }
        
        const todolist = taskData.todoChecklist?.map((item) => ({
        text : item,
        completed : false,
      }));

      const response = await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, {
        ...taskData,
        dueDate: dueDateObj.toISOString(),
        todoChecklist: todolist,
      });

      toast.success("Task created successfully");

      clearData();
      }catch(err){
        console.log("Error creating task:", err);
        setError("Failed to create task: " + (err.message || "Unknown error"));
        setLoading(false);
      }finally{
        setLoading(false)
      }
    }
  
  //Update Task
  const UpdateTask = async () => {
    setLoading(true)

    try{
      // Validate date before sending to backend
      const dueDateObj = new Date(taskData.dueDate);
      if (isNaN(dueDateObj.getTime())) {
        throw new Error("Invalid date format");
      }
      
      const todoList = taskData.todoChecklist?.map((item) => {
        const prevTodoChecklist = currentTask?.todoChecklist || [];
        const matchedTask = prevTodoChecklist.find((task) => task.text === item);

        return {
          text: item,
          completed: matchedTask ? matchedTask.completed : false,
        };
      });

      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TASK(taskId),
        {
          ...taskData,
          dueDate: dueDateObj.toISOString(),
          todoChecklist: todoList,
        }
      );

      toast.success("Task updated successfully");
      // Clear the form after successful update
      clearData();
      // Reset currentTask state
      setCurrentTask(null);
      // Navigate back to tasks list
      setTimeout(() => {
        navigate('/admin/tasks');
      }, 1000);
    }catch(err){
      console.error("Error updating task:", err)
      setError("Failed to update task: " + (err.message || "Unknown error"));
      setLoading(false)
    }finally{
      setLoading(false)
    }
  };

  const handleSubmit = async () => {
    setError(null);

    //Input Validation
    if (!taskData.title || !taskData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!taskData.description || !taskData.description.trim()) {
      setError("Description is required");
      return;
    }

    if (!taskData.dueDate || isNaN(new Date(taskData.dueDate).getTime())) {
      setError("Valid due date is required");
      return;
    }

    if (taskData.assignedTo?.length === 0) {
      setError("Task not assigned to any member");
      return;
    }
    if (taskData.todoChecklist?.length === 0) {
      setError("At least one todo task");
      return;
    }

    if (taskId) {
      UpdateTask();
      return;
    }

    CreateTask();
  };

  //get Task info by ID
  const getTaskDetailsByID = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_BY_ID(taskId)
      );
      
      if(response.data?.task){
        const taskInfo = response.data.task;
        setCurrentTask(taskInfo);

        setTaskData({
          title: taskInfo.title || "",
          description: taskInfo.description || "",
          priority: taskInfo.priority || "",
          dueDate: taskInfo.dueDate
           ? moment(taskInfo.dueDate).format("YYYY-MM-DD")
           : "",
          assignedTo: taskInfo.assignedTo?.map((item) => item?._id) || [],
          todoChecklist: taskInfo.todoChecklist?.map((item) => item?.text) || [],
          attachments: taskInfo.attachments || [],
        });
      }
    }catch(err){
      console.error("Error fetching task:", err)
    }
  };

  //Delete Task
  const deleteTask = async () => {
    try{
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));

      setOpenDeleteAlert(false);
      toast.success("Task deleted successfully");
      navigate('/admin/tasks')
    }catch(err){
      console.error("Error deleting task:", err.response?.data?.message || err.message);
      toast.error("Failed to delete task: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    if(taskId){
      getTaskDetailsByID(taskId)
    }
  }, [taskId])

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
          <div className="form-card col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-xl font-medium">
                {taskId ? "Update Task" : "Create Task"}
              </h2>

              {taskId && (
                <button
                  className="flex items-center gap-1.5 text-[13px] font-medium text-rose-500 bg-rose-50 rounded px-2 py-1 border border-rose-100 hover:border-rose-300 cursor-pointer"
                  onClick={() => setOpenDeleteAlert(true)}
                >
                  <LuTrash2 className="text-base" />
                  Delete
                </button>
              )}
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">
                Task Title
              </label>
              <input
                placeholder="Create App UI"
                className="form-input"
                value={taskData.title}
                onChange={({ target }) =>
                  handleValueChange("title", target.value)
                }
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Description
              </label>

              <textarea
                placeholder="Describe Box"
                className="form-input"
                rows={4}
                value={taskData.description}
                onChange={({ target }) =>
                  handleValueChange("description", target.value)
                }
              />
            </div>

            <div className="grid grid-cols-12 gap-4 mt-2">
              <div className="col-span-6 md:col-span-4">
                <label className="text-xs font-medium text-slate-600">
                  Priority
                </label>
                <SelectDropDown
                  options={PRIORITY_DATA}
                  value={taskData.priority}
                  onChange={(value) => handleValueChange("priority", value)}
                  placeholder="Select Priority"
                />
              </div>

              <div className="cols-span-6 md:col-span-4">
                <label className="text-xs font-medium text-slate-600">
                  Due Date
                </label>
                <input
                  placeholder="Create App UI"
                  className="form-input"
                  value={taskData.dueDate || ""}
                  onChange={({ target }) =>
                    handleValueChange("dueDate", target.value)
                  }
                  type="date"
                />
              </div>

              <div className="col-span-12 md:col-span-3">
                <label className="text-xs font-medium text-slate-600">
                  Assign To
                </label>

                <SelectUsers
                  selectedUsers={taskData.assignedTo}
                  setSelectedUsers={(value) => {
                    handleValueChange("assignedTo", value);
                  }}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Todo Checklist
              </label>

              <TodoListInput
                todoList={taskData?.todoChecklist}
                setTodoList={(value) =>
                  handleValueChange("todoChecklist", value)
                }
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Add Attachments
              </label>

              <AddAttachmentsInput
                attachments={taskData?.attachments}
                setAttachments={(value) =>
                  handleValueChange("attachments", value)
                }
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-500 mt-5">{error}</p>
            )}
            <div className="flex justify-end mt-7">
              <button
                className="add-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {taskId ? "UPDATE TASK" : "CREATE TASK"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
      isOpen={openDeleteAlert}
      onClose={() => setOpenDeleteAlert(false)}
      title="Delete Task"
      >
        <DeleteAlert
        content = "Are you sure you want to delete this task?"
        onDelete={() => deleteTask()}
        />
      </Modal>
    </DashboardLayout>
  );
}
