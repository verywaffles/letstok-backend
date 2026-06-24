const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// user tracking
const users = new Map(); // socket.id -> username

// helper: room naming
const dmRoom = (a, b) => {
    return [a, b].sort().join("-");
};

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // join global
    socket.on("join", (username) => {
        socket.username = username;
        users.set(socket.id, username);

        socket.join("global");

        io.emit("users", Array.from(users.values()));
    });

    // GLOBAL MESSAGE
    socket.on("message", (text) => {
        if (!socket.username) return;

        io.to("global").emit("message", {
            room: "global",
            user: socket.username,
            text,
            time: Date.now()
        });
    });

    // JOIN DM
    socket.on("joinDM", (otherUser) => {
        const room = dmRoom(socket.username, otherUser);

        socket.join(room);
        socket.currentRoom = room;

        socket.emit("dmJoined", room);
    });

    // DM MESSAGE
    socket.on("dmMessage", ({ to, text }) => {
        const room = dmRoom(socket.username, to);

        io.to(room).emit("message", {
            room,
            user: socket.username,
            text,
            time: Date.now()
        });
    });

    // GROUP CHAT
    socket.on("joinGroup", (groupName) => {
        socket.join(groupName);
        socket.currentRoom = groupName;

        socket.emit("groupJoined", groupName);
    });

    socket.on("groupMessage", ({ group, text }) => {
        io.to(group).emit("message", {
            room: group,
            user: socket.username,
            text,
            time: Date.now()
        });
    });

    // disconnect
    socket.on("disconnect", () => {
        users.delete(socket.id);
        io.emit("users", Array.from(users.values()));
    });
});

app.get("/", (req, res) => {
    res.send("LetsTok backend running");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on", PORT);
});
