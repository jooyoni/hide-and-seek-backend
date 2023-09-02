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
        isGaming: false,
        red: 0,
        blue: 0,
    };
    res.send({ roomNumber, success: true });
});

io.on("connection", function (socket) {
    socket.on("joinRoom", async (roomNumber) => {
        if (!openedRoomList[roomNumber]) socket.leave();
        await socket.join(roomNumber);
        let users = Array.from(io.sockets.adapter.rooms.get(roomNumber));
        let id = users[users.length - 1];
        let team =
            openedRoomList.roomNumber.red <= openedRoomList.roomNumber.blue
                ? "red"
                : "blue";
        openedRoomList.roomNumber[team]++;
        openedRoomList.roomNumber.users[id] = {
            nickname: "",
            top: 0,
            left: 0,
            team: team,
            isAdmin: users.length == 1 ? true : false,
            isReady: false,
        };
        openedRoomList;
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
        socket.on("ready", (id, isReady) => {
            if (openedRoomList.roomNumber.users[id].isAdmin) {
                //방장으로부터 발생한 ready일시 게임시작
                openedRoomList.roomNumber.isGaming = true;
                Object.keys(openedRoomList.roomNumber.users).map((id) => {
                    if (openedRoomList.roomNumber.users[id].team == "red")
                        openedRoomList.roomNumber.users[id].left = -150;
                    else openedRoomList.roomNumber.users[id].left = 1345;
                    openedRoomList.roomNumber.users[id].top = 700;
                });
                io.to(roomNumber).emit(
                    "gameStart",
                    Object.entries(openedRoomList.roomNumber.users)
                );
            } else {
                openedRoomList.roomNumber.users[id].isReady = isReady;
                io.to(roomNumber).emit("ready", id, isReady);
            }
        });
        socket.on("attack", (id) => {
            console.log();
            let enemy = Object.keys(openedRoomList.roomNumber.users);
            enemy.map((id) => {
                console.log(
                    id +
                        " " +
                        openedRoomList.roomNumber.users[id].top +
                        ` ${openedRoomList.roomNumber.users[id].left}`
                );
            });
            enemy = enemy.filter(
                (userId) =>
                    openedRoomList.roomNumber.users[id].team !==
                    openedRoomList.roomNumber.users[userId].team
            );
            io.to(roomNumber).emit("hit", id, enemy);
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
