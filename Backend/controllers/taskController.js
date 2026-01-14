const Task = require("../models/Task");
const Notification = require("../models/Notification");

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!dueDate) {
      return res.status(400).json({ message: "Due date is required" });
    }

    // Validate date format
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid due date format" });
    }

    if (!Array.isArray(assignedTo)) {
      return res
        .status(400)
        .json({ message: "assignedTo must be an array of user ID's" });
    }

    if (assignedTo.length === 0) {
      return res
        .status(400)
        .json({ message: "Task must be assigned to at least one user" });
    }

    if (!Array.isArray(todoChecklist)) {
      return res
        .status(400)
        .json({ message: "todoChecklist must be an array" });
    }

    if (todoChecklist.length === 0) {
      return res
        .status(400)
        .json({ message: "Task must have at least one todo item" });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDateObj,
      assignedTo,
      createdBy: req.user._id,
      todoChecklist,
      attachments,
    });

    // Create notification for each assigned user
    for (const userId of assignedTo) {
      await Notification.create({
        recipient: userId, // Required field
        userId: userId,   // Also include for consistency
        title: `New Task Assigned: ${title}`,
        message: `A new task "${title}" has been assigned to you by ${req.user.name}.`,
        type: "task_assignment",
        relatedId: task._id,
        relatedModel: "Task",
      });
    }

    res.status(201).json({ message: "Task created successfully", task });
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (status) {
      filter.status = status;
    }

    let tasks;

    if (req.user.role === "admin") {
      tasks = await Task.find(filter).populate(
        "assignedTo",
        "name email profileImageUrl"
      );
    } else {
      tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate(
        "assignedTo",
        "name email profileImageUrl"
      );
    }

    // Add completed todoChecklist count to each task
    tasks = tasks.map(task => {
      const completedCount = task.todoChecklist.filter(
        (item) => item.completed
      ).length;
      return { ...task._doc, completedTodoCount: completedCount };
    });

    // Get accurate counts across all statuses using countDocuments for efficiency
    let baseFilter = {};
    if (req.user.role !== "admin") {
      baseFilter = { assignedTo: req.user._id };
    }
    
    // Use Promise.all to execute all count queries concurrently
    const [
      allTasksCount,
      pendingTasksCount,
      inProgressTasksCount,
      completedTasksCount
    ] = await Promise.all([
      Task.countDocuments(baseFilter),
      Task.countDocuments({ ...baseFilter, status: "Pending" }),
      Task.countDocuments({ ...baseFilter, status: "In Progress" }),
      Task.countDocuments({ ...baseFilter, status: "Completed" })
    ]);
    
    //Status summary counts - calculate from database counts, not filtered tasks
    const statusSummary = {
      all: allTasksCount,
      pending: pendingTasksCount,
      inProgress: inProgressTasksCount,
      completed: completedTasksCount
    };

    res.status(200).json({ tasks, statusSummary });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email profileImageUrl")
      .populate("createdBy", "name email profileImageUrl");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ task });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update task details
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    ).populate(
      "createdBy",
      "name email profileImageUrl"
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if user is authorized to update the task
    const isAdmin = req.user.role === "admin";
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(
      (user) => user._id.toString() === req.user._id.toString()
    );

    if (!isAdmin && !isCreator && !isAssigned) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this task" });
    }

    // Update fields if provided
    if (req.body.title !== undefined) {
      if (!req.body.title || !req.body.title.trim()) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      task.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (!req.body.description || !req.body.description.trim()) {
        return res.status(400).json({ message: "Description cannot be empty" });
      }
      task.description = req.body.description.trim();
    }

    if (req.body.priority !== undefined) {
      if (!["Low", "Medium", "High"].includes(req.body.priority)) {
        return res.status(400).json({ message: "Invalid priority value" });
      }
      task.priority = req.body.priority;
    }

    if (req.body.dueDate !== undefined) {
      if (!req.body.dueDate) {
        return res.status(400).json({ message: "Due date is required" });
      }
      
      const dueDateObj = new Date(req.body.dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({ message: "Invalid due date format" });
      }
      task.dueDate = dueDateObj;
    }

    if (req.body.todoChecklist !== undefined) {
      if (!Array.isArray(req.body.todoChecklist)) {
        return res.status(400).json({ message: "todoChecklist must be an array" });
      }
      task.todoChecklist = req.body.todoChecklist;
    }

    if (req.body.attachments !== undefined) {
      if (!Array.isArray(req.body.attachments)) {
        return res.status(400).json({ message: "attachments must be an array" });
      }
      task.attachments = req.body.attachments;
    }

    if (req.body.assignedTo !== undefined) {
      if (!Array.isArray(req.body.assignedTo)) {
        return res
          .status(400)
          .json({ message: "assignedTo must be an array of user ID's" });
      }

      if (req.body.assignedTo.length === 0) {
        return res
          .status(400)
          .json({ message: "Task must be assigned to at least one user" });
      }

      // Check if assignedTo has changed
      const previousAssignedTo = task.assignedTo;
      task.assignedTo = req.body.assignedTo;

      // Create notification for newly assigned users
      const newAssignments = req.body.assignedTo.filter(
        (userId) => !previousAssignedTo.includes(userId)
      );
      for (const userId of newAssignments) {
        await Notification.create({
          recipient: userId, // Required field
          userId: userId,   // Also include for consistency
          title: `Task Reassigned: ${task.title}`,
          message: `You have been assigned to task "${task.title}" by ${req.user.name}.`,
          type: "task_assignment",
          relatedId: task._id,
          relatedModel: "Task",
        });
      }
    }

    await task.save();
    
    // Create notification for task updates to all assigned users
    for (const assignedUser of task.assignedTo) {
      const userId = assignedUser._id || assignedUser; // Handle both populated and non-populated user references
      if (req.user._id.toString() !== userId.toString()) { // Don't notify the user who made the change
        await Notification.create({
          recipient: userId, // Required field
          userId: userId,   // Also include for consistency
          title: `Task Updated: ${task.title}`,
          message: `Task "${task.title}" has been updated by ${req.user.name}.`,
          type: "task_update",
          relatedId: task._id,
          relatedModel: "Task",
        });
      }
    }

    res.json({ task });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user is authorized to delete the task
    const isAdmin = req.user.role === "admin";
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this task" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update task status
const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    ).populate(
      "createdBy",
      "name email profileImageUrl"
    );
    
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAssigned = task.assignedTo.some(
      (user) => user._id.toString() === req.user._id.toString()
    );

    if (!isAssigned && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not Authorised" });
    }

    // Validate status value
    const allowedStatuses = ["Pending", "In Progress", "Completed"];
    const newStatus = req.body.status;
    
    if (!newStatus) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status value. Allowed values: Pending, In Progress, Completed" });
    }

    task.status = newStatus;

    // Handle special cases for status updates
    if (task.status === "Completed") {
      // When marking as completed, mark all todo items as completed and set progress to 100%
      task.todoChecklist.forEach((item) => (item.completed = true));
      task.progress = 100;
    } else if (task.status === "Pending") {
      // When marking as pending, reset progress to 0% but don't touch checklist items
      // (users might want to keep partially completed items)
      const completedCount = task.todoChecklist.filter(
        (item) => item.completed
      ).length;
      const totalItems = task.todoChecklist.length;
      task.progress =
        totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    } else if (task.status === "In Progress") {
      // When marking as in progress, ensure progress reflects actual checklist completion
      const completedCount = task.todoChecklist.filter(
        (item) => item.completed
      ).length;
      const totalItems = task.todoChecklist.length;
      task.progress =
        totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    }

    await task.save();
    
    // Create notification for status update for all assigned users
    for (const assignedUser of task.assignedTo) {
      const userId = assignedUser._id || assignedUser; // Handle both populated and non-populated user references
      await Notification.create({
        recipient: userId, // Required field
        userId: userId,   // Also include for consistency
        title: `Task Status Updated: ${task.title}`,
        message: `Task "${task.title}" status has been updated to ${newStatus} by ${req.user.name}.`,
        type: "task_update",
        relatedId: task._id,
        relatedModel: "Task",
      });
    }
    
    // Create notification for the task creator (admin) when status changes
    await Notification.create({
      recipient: task.createdBy, // Required field
      userId: task.createdBy,   // Also include for consistency
      title: `Status Update: ${task.title}`,
      message: `Task "${task.title}" status has been updated to ${newStatus} by ${req.user.name}.`,
      type: "task_update",
      relatedId: task._id,
      relatedModel: "Task",
    });
    
    res.json({ task });
  } catch (err) {
    console.error("Error updating task status:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update task checklist
const updateTaskChecklist = async (req, res) => {
  try {
    const { todoChecklist } = req.body;
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    ).populate(
      "createdBy",
      "name email profileImageUrl"
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAssigned = task.assignedTo.some(
      (user) => user._id.toString() === req.user._id.toString()
    );

    if (!isAssigned && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update checklist" });
    }

    task.todoChecklist = todoChecklist;

    const completedCount = task.todoChecklist.filter(
      (item) => item.completed
    ).length;
    const totalItems = task.todoChecklist.length;
    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    if (task.progress === 100) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else {
      task.status = "Pending";
    }

    await task.save();
    
    // Create notification for checklist update for all assigned users
    for (const assignedUser of task.assignedTo) {
      const userId = assignedUser._id || assignedUser; // Handle both populated and non-populated user references
      await Notification.create({
        recipient: userId, // Required field
        userId: userId,   // Also include for consistency
        title: `Task Checklist Updated: ${task.title}`,
        message: `Task "${task.title}" checklist has been updated by ${req.user.name}.`,
        type: "task_update",
        relatedId: task._id,
        relatedModel: "Task",
      });
    }
    
    // Create notification for the task creator (admin) when checklist changes
    await Notification.create({
      recipient: task.createdBy, // Required field
      userId: task.createdBy,   // Also include for consistency
      title: `Checklist Update: ${task.title}`,
      message: `Task "${task.title}" checklist has been updated by ${req.user.name}.`,
      type: "task_update",
      relatedId: task._id,
      relatedModel: "Task",
    });
    
    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get dashboard data for admin
const getDashboardData = async (req, res) => {
  try {
    //Fetch statistics
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const inProgressTasks = await Task.countDocuments({ status: "In Progress" });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Ensure all possible statuses are included
    const taskStatuses = ["Pending", "In Progress", "Completed"];

    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("assignedTo", "name email profileImageUrl");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get dashboard data for user
const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const pendingTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Pending",
    });
    const inProgressTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "In Progress",
    });
    const completedTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    const recentTasks = await Task.find({ assignedTo: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("assignedTo", "name email profileImageUrl");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
};
