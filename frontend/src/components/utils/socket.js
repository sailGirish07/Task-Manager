import { io } from "socket.io-client";

// const SOCKET_URL = "https://task-manager-1-j9dy.onrender.com"; // Update this to match your backend URL
const SOCKET_URL = "http://localhost:8000";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});