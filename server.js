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

// =====================
// STORAGE
// =====================

const users = new Map();
const globalMessages = [];

// =====================
// HELPERS
// =====================

function getDMRoom(user1, user2) {
    return [user1, user2].sort().join(":");
}

// =====================
// ROUTES
// =====================

app.get("/", (req, res) => {
    res.send("LetsTok backend running");
});

// =====================
// SOCKET.IO
// =====================

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // JOIN
    socket.on("join", (username) => {

        socket.username = username;

        users.set(socket.id, username);

        socket.join("global");

        console.log(username + " joined");

        io.emit("users", [...users.values()]);

        socket.emit("history", globalMessages);

    });

    // GLOBAL MESSAGE
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

        const room = getDMRoom(
            socket.username,
            otherUser
        );

        socket.join(room);

        socket.emit("dmJoined", room);

        console.log(
            socket.username +
            " joined DM " +
            room
        );

    });

    // SEND DM
    socket.on("dmMessage", ({ to, text }) => {

        if (!socket.username) return;

        const room = getDMRoom(
            socket.username,
            to
        );

        io.to(room).emit("message", {
            room,
            user: socket.username,
            text,
            time: Date.now()
        });

    });

    // DISCONNECT
    socket.on("disconnect", () => {

        console.log(
            "Disconnected:",
            socket.id
        );

        users.delete(socket.id);

        io.emit(
            "users",
            [...users.values()]
        );

    });

});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(
        "SERVER RUNNING ON PORT",
        PORT
    );

});
