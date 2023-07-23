const express = require("express");
var cors = require("cors");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use(cors());
app.set("port", process.env.PORT || 5000);
// app.get("/", (req, res) => {
//     res.send({ data: "hi" });
// });

const openedRoomList = [];

app.post("/create-room", (req, res) => {
    const roomNumber = Math.floor(Math.random() * 100000);
    const id = String(Math.floor(Math.random() * 10000000));
    openedRoomList.push({
        number: roomNumber,
        users: [{ id, nickname: "" }],
    });
    res.send({ id, roomNumber, success: true });
});

io.on("connection", function (socket) {
    if (openedRoomList[0]) console.log(openedRoomList[0].users);
    socket.on("joinRoom", async (roomNumber) => {
        socket.join(roomNumber);
        let id = String(Math.floor(Math.random() * 10000000));
        io.to(roomNumber).emit("joinSuccess", id);
        socket.on("setNickname", (id, nickname) => {
            openedRoomList
                .filter((room) => room.number == roomNumber)[0]
                .users.push({
                    id,
                    nickname,
                });
            console.log(openedRoomList[0].users);
        });
        socket.on("chat", (chat) => {
            console.log(chat);
            io.to(roomNumber).emit("chat", chat);
        });
        socket.on("disconnect", () => {
            socket.leave(roomNumber);
            console.log("disconnected");
        });
    });
});

server.listen(app.get("port"), () => {
    console.log("isRunning on 5000");
});
