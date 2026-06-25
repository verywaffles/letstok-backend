const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// =====================
// SOCKET SETUP
// =====================

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
// socket.id -> username

const globalMessages = []; 
// {room, user, text, time}

const dms = new Map(); 
// room -> [{user, text, time}]

// =====================
// HELPERS
// =====================

function getDMRoom(user1, user2) {
    return [user1, user2].sort().join(":");
}

function pushLimited(arr, item, limit = 100) {
    arr.push(item);
    if (arr.length > limit) arr.shift();
}

// =====================
// ROUTES
// =====================

app.get("/", (req, res) => {
    res.send("LetsTok backend running 🚀");
});

// =====================
// SOCKET.IO
// =====================

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // =====================
    // JOIN SYSTEM
    // =====================

    socket.on("join", (username) => {

        if (!username) return;

        socket.username = username;
        users.set(socket.id, username);

        // always join global
        socket.join("global");

        console.log(username + " joined global");

        // send user list
        io.emit("users", [...users.values()]);

        // send global chat history
        socket.emit("history", globalMessages);
    });

    // =====================
    // GLOBAL CHAT (PRIORITY 1 CORE)
    // =====================

    socket.on("message", (text) => {

        if (!socket.username) return;
        if (!text || text.trim() === "") return;

        const msg = {
            room: "global",
            user: socket.username,
            text,
            time: Date.now()
        };

        pushLimited(globalMessages, msg, 100);

        io.to("global").emit("message", msg);
    });

    // =====================
    // DM SYSTEM (kept, isolated)
    // =====================

    socket.on("joinDM", (otherUser) => {

        if (!socket.username) return;

        const room = getDMRoom(socket.username, otherUser);

        socket.join(room);

        if (!dms.has(room)) {
            dms.set(room, []);
        }

        socket.emit("dmJoined", room);

        console.log(`${socket.username} joined DM: ${room}`);
    });

    socket.on("dmMessage", ({ to, text }) => {

        if (!socket.username) return;
        if (!to || !text) return;

        const room = getDMRoom(socket.username, to);

        const msg = {
            room,
            user: socket.username,
            text,
            time: Date.now()
        };

        if (!dms.has(room)) {
            dms.set(room, []);
        }

        pushLimited(dms.get(room), msg, 100);

        io.to(room).emit("message", msg);
    });

    // =====================
    // DISCONNECT
    // =====================

    socket.on("disconnect", () => {

        console.log("Disconnected:", socket.id);

        users.delete(socket.id);

        io.emit("users", [...users.values()]);
    });

});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("SERVER RUNNING ON PORT", PORT);
});
