const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
cors: {
origin: "*",
methods: ["GET", "POST"]
}
});

console.log("SERVER STARTING...");

// ONLINE USERS
const users = new Map();

// SIMPLE MESSAGE HISTORY
const globalMessages = [];

// DM ROOMS
function getDMRoom(user1, user2) {
return [user1, user2].sort().join(":");
}

// ROOT ROUTE
app.get("/", (req, res) => {
res.send("LetsTok backend running");
});

// SOCKET CONNECTION
io.on("connection", (socket) => {

```
console.log("Connected:", socket.id);

// USER JOINS
socket.on("join", (username) => {

    socket.username = username;

    users.set(socket.id, username);

    socket.join("global");

    // Send existing users
    io.emit("users", [...users.values()]);

    // Send message history
    socket.emit("history", globalMessages);

    console.log(username + " joined");

});

// GLOBAL CHAT
socket.on("message", (text) => {

    if (!socket.username) return;

    const msg = {
        room: "global",
        user: socket.username,
        text,
        time: Date.now()
    };

    globalMessages.push(msg);

    if (globalMessages.length > 100) {
        globalMessages.shift();
    }

    io.to("global").emit("message", msg);

});

// JOIN DM
socket.on("joinDM", (otherUser) => {

    if (!socket.username) return;

    const room = getDMRoom(socket.username, otherUser);

    socket.join(room);

    socket.emit("dmJoined", room);

    console.log(socket.username + " joined DM " + room);

});

// SEND DM
socket.on("dmMessage", ({ to, text }) => {

    if (!socket.username) return;

    const room = getDMRoom(socket.username, to);

    io.to(room).emit("message", {
        room,
        user: socket.username,
        text,
        time: Date.now()
    });

});

// DISCONNECT
socket.on("disconnect", () => {

    users.delete(socket.id);

    io.emit("users", [...users.values()]);

    console.log("Disconnected:", socket.id);

});
```

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
console.log("SERVER RUNNING ON PORT", PORT);
});
