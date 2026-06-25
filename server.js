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

// ONLINE USERS
const users = new Map();

// DM ROOM HELPER
function dmRoom(a, b) {
return [a, b].sort().join("-");
}

io.on("connection", (socket) => {

```
console.log("Connected:", socket.id);

// USER JOINS
socket.on("join", (username) => {
    socket.username = username;

    users.set(socket.id, username);

    socket.join("global");

    io.emit("users", Array.from(users.values()));

    console.log(username + " joined");
});

// GLOBAL CHAT
socket.on("message", (text) => {

    if (!socket.username) return;

    io.to("global").emit("message", {
        room: "global",
        user: socket.username,
        text: text,
        time: Date.now()
    });

});

// JOIN DM
socket.on("joinDM", (otherUser) => {

    if (!socket.username) return;

    const room = dmRoom(socket.username, otherUser);

    socket.join(room);

    socket.emit("dmJoined", room);

});

// SEND DM
socket.on("dmMessage", ({ to, text }) => {

    if (!socket.username) return;

    const room = dmRoom(socket.username, to);

    io.to(room).emit("message", {
        room: room,
        user: socket.username,
        text: text,
        time: Date.now()
    });

});

// GROUPS
socket.on("joinGroup", (groupName) => {

    socket.join(groupName);

    socket.emit("groupJoined", groupName);

});

socket.on("groupMessage", ({ group, text }) => {

    if (!socket.username) return;

    io.to(group).emit("message", {
        room: group,
        user: socket.username,
        text: text,
        time: Date.now()
    });

});

// DISCONNECT
socket.on("disconnect", () => {

    users.delete(socket.id);

    io.emit("users", Array.from(users.values()));

    console.log("Disconnected:", socket.id);

});
```

});

app.get("/", (req, res) => {
res.send("LetsTok backend running");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
console.log("Server running on port", PORT);
});
