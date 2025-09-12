const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(".")); // מגיש את ה-HTML מהתיקייה

io.on("connection", (socket) => {
  socket.on("join", () => {
    socket.broadcast.emit("new-user", socket.id);
  });

  socket.on("offer", (data) => {
    socket.to(data.target).emit("offer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("answer", (data) => {
    socket.to(data.target).emit("answer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("candidate", (data) => {
    socket.to(data.target).emit("candidate", { candidate: data.candidate, from: socket.id });
  });
});

server.listen(3000, () => console.log("שרת רץ על http://localhost:3000"));