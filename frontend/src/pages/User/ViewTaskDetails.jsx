import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';

export default function ViewTaskDetails() {
  const {id} = useParams();
  const [task, setTask] = useState(null);

  const getStatusTagColor = (status) => {
    switch (status){
      case 'In Progress':
        return 'text-cyan-500 bg-gray-50 border border-cyan-500/10';
      case 'Completed':
        return 'text-indigo-500 bg-lime-50 border border-lime-500/20';
      default:
        return 'text-violet-500 bg-violet-50 border border-violet-500/10';
    }
  };

  //Get task info by id
  const getTaskDetailsByID = async() => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(id));
      
      if(response.data){
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
    window.open(link, '_blank');
  };

  useEffect(() => {
   if(id){
    getTaskDetailsByID();
   }
   return () => {};
  }, [id]);

  return (
    <div>
      view task details
    </div>
  )
}


