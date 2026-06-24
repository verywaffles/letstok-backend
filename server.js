const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// 🔥 IMPORTANT: allow Vercel frontend to connect
app.use(cors({
  origin: "*"
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// optional health check (useful for debugging)
app.get("/", (req, res) => {
  res.send("LetsTok server is running");
});

// store users by socket id
const users = {};

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // join chat
  socket.on("join", (username) => {
    users[socket.id] = username;

    io.emit("users", Object.values(users));
  });

  // send message
  socket.on("message", (msg) => {
    const username = users[socket.id] || "Guest";

    io.emit("message", {
      user: username,
      text: msg,
      time: Date.now()
    });
  });

  // disconnect
  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users", Object.values(users));
  });
});

// listen on VM port
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`LetsTok running on port ${PORT}`);
});