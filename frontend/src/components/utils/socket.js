import { io } from "socket.io-client";

const SOCKET_URL = "https://task-manager-1-j9dy.onrender.com"; // Update this to match your backend URL

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});