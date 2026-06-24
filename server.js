const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO setup (IMPORTANT for Vercel + Render)
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Store online users
const users = new Map();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User joins with username
    socket.on("join", (username) => {
        socket.username = username;
        users.set(socket.id, username);

        io.emit("users", Array.from(users.values()));
    });

    // Handle chat messages
    socket.on("message", (text) => {
        if (!socket.username) return;

        io.emit("message", {
            user: socket.username,
            text: text,
            time: Date.now()
        });
    });

    // Disconnect
    socket.on("disconnect", () => {
        users.delete(socket.id);
        io.emit("users", Array.from(users.values()));
    });
});

// Health route (Render likes this)
app.get("/", (req, res) => {
    res.send("LetsTok backend running");
});

// IMPORTANT: Render uses process.env.PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("LetsTok server running on port", PORT);
});
