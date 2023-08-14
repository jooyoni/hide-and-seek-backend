const express = require("express");
var cors = require("cors");
const http = require("http");
const { disconnect } = require("process");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use(cors());
app.set("port", process.env.PORT || 5000);
// app.get("/", (req, res) => {
//     res.send({ data: "hi" });
// });

const openedRoomList = {};

app.post("/create-room", (req, res) => {
    const roomNumber = Math.floor(Math.random() * 100000);
    openedRoomList.roomNumber = {
        users: {},
    };
    res.send({ roomNumber, success: true });
});

io.on("connection", function (socket) {
    socket.on("joinRoom", async (roomNumber) => {
        if (!openedRoomList[roomNumber]) socket.leave();
        await socket.join(roomNumber);
        let users = Array.from(io.sockets.adapter.rooms.get(roomNumber));
        let id = users[users.length - 1];
        openedRoomList.roomNumber.users[id] = {
            nickname: "",
            top: 0,
            left: 0,
        };
        console.log(Object.entries(openedRoomList.roomNumber.users));
        io.to(roomNumber).emit(
            "joinSuccess",
            id,
            Object.entries(openedRoomList.roomNumber.users)
        );
        socket.on("setNickname", (id, nickname) => {
            openedRoomList.roomNumber.users[id].nickname = nickname;
            io.to(roomNumber).emit("updateNickname", id, nickname);
            console.log("setnickname");
        });
        socket.on("setLocation", (id, location) => {
            openedRoomList.roomNumber.users[id].top = location.top;
            openedRoomList.roomNumber.users[id].left = location.left;
            io.to(roomNumber).emit(
                "updateLocation",
                id,
                location.top,
                location.left
            );
        });
        socket.on("chat", (id, chat) => {
            console.log(chat);
            io.to(roomNumber).emit("chat", id, chat);
        });
        socket.on("disconnect", () => {
            socket.leave(roomNumber);
            console.log("disconnect");
            // console.log(io.sockets.adapter.rooms.get(roomNumber));
        });
    });
});

server.listen(app.get("port"), () => {
    console.log("isRunning on 5000");
});
