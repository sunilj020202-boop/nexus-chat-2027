const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function room(id) {
  if (!rooms.has(id)) rooms.set(id, new Map());
  return rooms.get(id);
}

io.on("connection", socket => {
  socket.on("join-room", ({ roomId, username }) => {
    roomId = String(roomId || "").trim().toUpperCase().slice(0, 24);
    username = String(username || "Guest").trim().slice(0, 24) || "Guest";
    if (!roomId) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;

    const users = room(roomId);
    users.set(socket.id, username);

    socket.emit("room-users", [...users.values()]);
    socket.to(roomId).emit("room-users", [...users.values()]);
    io.to(roomId).emit("system", `${username} joined the room`);
  });

  socket.on("message", text => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    text = String(text || "").trim().slice(0, 500);
    if (!text) return;

    io.to(roomId).emit("message", {
      username: socket.data.username || "Guest",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  });

  socket.on("typing", isTyping => {
    const roomId = socket.data.roomId;
    if (roomId) socket.to(roomId).emit("typing", {
      username: socket.data.username || "Guest",
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const users = rooms.get(roomId);
    const username = users.get(socket.id) || "Guest";
    users.delete(socket.id);

    io.to(roomId).emit("room-users", [...users.values()]);
    io.to(roomId).emit("system", `${username} left the room`);

    if (users.size === 0) rooms.delete(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Chat server running on port ${PORT}`);
});
