import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import {LuSquareArrowRight} from 'react-icons/lu';


export default function ViewTaskDetails() {
  const { id } = useParams();
  const [task, setTask] = useState(null);

  const getStatusTagColor = (status) => {
    switch (status) {
      case "In Progress":
        return "text-cyan-500 bg-gray-50 border border-cyan-500/10";
      case "Completed":
        return "text-indigo-500 bg-lime-50 border border-lime-500/20";
      default:
        return "text-violet-500 bg-violet-50 border border-violet-500/10";
    }
  };

  //Get task info by id
  const getTaskDetailsByID = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_BY_ID(id)
      );

      if (response.data) {
        const taskInfo = response.data;
        setTask(taskInfo);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  //Handle todo check
  const updateTodoCheckList = async (index) => {};

  //Handle attachment link
  const handleLinkClick = (link) => {
    window.open(link, "_blank");
  };

  useEffect(() => {
    if (id) {
      getTaskDetailsByID();
    }
    return () => {};
  }, [id]);

  return (
    <div className="mt-5">
      {task && (
        <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
          <div className="form-card col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-xl font-medium">{task?.title}</h2>

              <div
                className={`text-[11px] md:text-[13px] font-medium ${getStatusTagColor(
                  task?.status
                )} px-4 py-0.5 rounded`}
              >
                {task?.status}
              </div>
            </div>
            <div className="mt-4">
              <InfoBox label="Description" value={task?.description} />
            </div>

            <div className="grid grid-cols-12 gap-4 mt-4">
              <div className="col-span-6 md:col-span-4">
                <InfoBox label="Priority" value={task?.priority} />
              </div>
              <div className="col-span-6 md:col-span-4">
                <InfoBox label="Due Date" value={task?.dueDate ? moment(task?.dueDate).format('Do MMM YYYY') : 'N/A'} />
            </div>
            <div className="col-span-6 md:col-span-4">
              <label className="text-xs font-medium text-slate-500">Assigned To</label>

              <AvatarGroup 
                avatars={task?.assignedTo?.map((item) => item?.profileImageUrl) || []} 
                maxVisible={5}
              />
              </div>
            </div>

            <div className="mt-2">
              <label className="text-xs font-medium text-slate-500">
                Todo Checklist
              </label>

              {task?.todoChecklist?.map((item, index) => {
                <TodoChecklist
                key={`todo_${index}`}
                text={item.text}
                isChecked={item?.completed}
                onChange={() => updateTodoCheckList(index)}
                />
              })}

            </div>

            
          </div>
        </div>
      )}
    </div>
  );
}

const InfoBox = ({ label, value }) => {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">
        {label}
        </label>

      <p className="text-[12px] md:text-[13px] font-medium text-gray-700 mt-0.5">
        {value}
      </p>
    </div>
  );
};

const TodoChecklist = ({ text, isChecked, onChange }) => {
  return (
    <div className="flex items-center ap-3 p-3">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded-sm outline-none cursor-pointer"
      />
      <p className="text-[13px] text-gray-800">{text}</p>
    </div>
  );
};
