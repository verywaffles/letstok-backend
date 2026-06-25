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

console.log("🚀 LETSTOK SERVER STARTING...");

// =====================
// STORAGE
// =====================

const users = new Map(); 
// socket.id -> username

const globalMessages = []; 
// { room, user, text, image, time }

const dmMessages = new Map(); 
// room -> message array

// =====================
// HELPERS
// =====================

function getDMRoom(user1, user2) {
    return [user1, user2].sort().join(":");
}

function addLimited(arr, item, limit = 100) {
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
    // JOIN
    // =====================

    socket.on("join", (username) => {

        if (!username) return;

        socket.username = username;
        users.set(socket.id, username);

        socket.join("global");

        console.log(`👤 ${username} joined`);

        // send user list
        io.emit("users", [...users.values()]);

        // send chat history
        socket.emit("history", globalMessages);
    });

    // =====================
    // GLOBAL MESSAGE (FIXED SAFE VERSION)
    // =====================

    socket.on("message", (data) => {

        if (!socket.username) return;

        // 🔥 FIX: accept BOTH string and object safely
        let text = "";
        let image = null;

        if (typeof data === "string") {
            text = data;
        } else if (typeof data === "object" && data !== null) {
            text = data.text || "";
            image = data.image || null;
        }

        // ignore empty messages
        if (!text && !image) return;

        const msg = {
            room: "global",
            user: socket.username,
            text,
            image,
            time: Date.now()
        };

        addLimited(globalMessages, msg, 100);

        io.to("global").emit("message", msg);
    });

    // =====================
    // JOIN DM
    // =====================

    socket.on("joinDM", (otherUser) => {

        if (!socket.username || !otherUser) return;

        const room = getDMRoom(socket.username, otherUser);

        socket.join(room);

        if (!dmMessages.has(room)) {
            dmMessages.set(room, []);
        }

        socket.emit("dmJoined", room);

        console.log(`💬 ${socket.username} joined DM ${room}`);
    });

    // =====================
    // DM MESSAGE
    // =====================

    socket.on("dmMessage", ({ to, text }) => {

        if (!socket.username || !to) return;

        const room = getDMRoom(socket.username, to);

        const msg = {
            room,
            user: socket.username,
            text: text || "",
            time: Date.now()
        };

        if (!dmMessages.has(room)) {
            dmMessages.set(room, []);
        }

        addLimited(dmMessages.get(room), msg, 100);

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
    console.log(`✅ LETSTOK RUNNING ON PORT ${PORT}`);
});
