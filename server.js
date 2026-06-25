const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
origin: [
"https://letstok.vercel.app"
],
credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
cors: {
origin: [
"https://letstok.vercel.app"
],
methods: ["GET", "POST"],
credentials: true
}
});

// user tracking
const users = new Map();

// helper: room naming
const dmRoom = (a, b) => {
return [a, b].sort().join("-");
};

io.on("connection", (socket) => {

```
console.log("Connected:", socket.id);

socket.on("join", (username) => {
    socket.username = username;
    users.set(socket.id, username);

    socket.join("global");

    io.emit("users", Array.from(users.values()));
});

socket.on("message", (text) => {
    if (!socket.username) return;

    io.to("global").emit("message", {
        room: "global",
        user: socket.username,
        text,
        time: Date.now()
    });
});

socket.on("joinDM", (otherUser) => {
    if (!socket.username) return;

    const room = dmRoom(socket.username, otherUser);

    socket.join(room);
    socket.currentRoom = room;

    socket.emit("dmJoined", room);
});

socket.on("dmMessage", ({ to, text }) => {
    if (!socket.username) return;

    const room = dmRoom(socket.username, to);

    io.to(room).emit("message", {
        room,
        user: socket.username,
        text,
        time: Date.now()
    });
});

socket.on("joinGroup", (groupName) => {
    socket.join(groupName);
    socket.currentRoom = groupName;

    socket.emit("groupJoined", groupName);
});

socket.on("groupMessage", ({ group, text }) => {
    if (!socket.username) return;

    io.to(group).emit("message", {
        room: group,
        user: socket.username,
        text,
        time: Date.now()
    });
});

socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("users", Array.from(users.values()));
});
```

});

app.get("/", (req, res) => {
res.send("LetsTok backend running");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
console.log("Server running on", PORT);
});
