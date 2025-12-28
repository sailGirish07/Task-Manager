import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:8000"; // Update this to match your backend URL

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});
