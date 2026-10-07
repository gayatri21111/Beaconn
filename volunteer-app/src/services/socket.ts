import { io } from "socket.io-client";

const SERVER_URL = "https://rescuebeacon-backend.onrender.com";

const socket = io(SERVER_URL, {
  transports: ["polling", "websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

socket.on("connect_error", (err) => {
  console.log("Socket Error:", err.message, err);
});

// Diagnostic: confirms whether the connection actually upgrades to a
// websocket, or silently stays on slower HTTP long-polling. If it never
// logs "Transport upgraded to: websocket", that's very likely why updates
// feel delayed instead of instant.
socket.on("connect", () => {
  console.log("✅ Connected — transport:", socket.io.engine.transport.name);

  socket.io.engine.on("upgrade", (transport) => {
    console.log("⬆️ Transport upgraded to:", transport.name);
  });
});

export default socket;
