// // import { io } from "socket.io-client";

// // const SERVER_URL = "https://beacon-production-4023.up.railway.app";

// // const socket = io(SERVER_URL, {
// //   transports: ["polling", "websocket"],
// //   autoConnect: true,
// //   reconnection: true,
// //   reconnectionAttempts: Infinity,
// //   reconnectionDelay: 1000,
// // });

// // socket.on("connect_error", (err) => {
// //   console.log("Socket Error:", err.message, err);
// // });

// // export default socket;

// import { io } from "socket.io-client";

// const SERVER_URL = "https://beacon-production-4023.up.railway.app";

// const socket = io(SERVER_URL, {
//   transports: ["polling", "websocket"],
//   autoConnect: true,
//   reconnection: true,
//   reconnectionAttempts: Infinity,
//   reconnectionDelay: 1000,
// });

// socket.on("connect_error", (err) => {
//   console.log("Socket Error:", err.message, err);
// });

// // Diagnostic: confirms whether the connection actually upgrades to a
// // websocket, or silently stays on slower HTTP long-polling. If it never
// // logs "Transport upgraded to: websocket", that's very likely why updates
// // feel delayed instead of instant.
// socket.on("connect", () => {
//   console.log("✅ Connected — transport:", socket.io.engine.transport.name);

//   socket.io.engine.on("upgrade", (transport) => {
//     console.log("⬆️ Transport upgraded to:", transport.name);
//   });
// });

// export default socket;

import { io } from "socket.io-client";

const SERVER_URL = "https://beacon-production-4023.up.railway.app";

const socket = io(SERVER_URL, {
  transports: ["polling", "websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("✅ Connected to RescueBeacon server");
  console.log("Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.log("❌ Socket Error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("⚠️ Socket disconnected:", reason);
});

export default socket;
