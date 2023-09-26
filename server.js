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

app.get("/create-room", (req, res) => {
    const roomNumber = Math.floor(Math.random() * 100000);
    openedRoomList[roomNumber] = {
        users: {},
        isGaming: false,
        red: 0,
        blue: 0,
    };
    res.send({ roomNumber, success: true });
});
app.get("/join-room/:id", (req, res) => {
    console.log(openedRoomList);
    if (openedRoomList[req.params.id]) res.send(true);
    else res.send(false);
});
function respawn(roomNumber) {
    let room = openedRoomList[roomNumber];
    let userIds = Object.keys(room.users);
    room.isGaming = false;
    userIds.map((id) => {
        room.users[id].isReady = false;
        room.users[id].health = 100;
    });
}

io.on("connection", function (socket) {
    socket.on("joinRoom", async (roomNumber) => {
        console.log(openedRoomList);
        socket.leave(roomNumber);
        if (!openedRoomList[roomNumber]) {
            socket.leave(roomNumber);
            return;
        }
        await socket.join(roomNumber);
        let users = Array.from(io.sockets.adapter.rooms.get(roomNumber));
        let id = users[users.length - 1];
        let team =
            openedRoomList[roomNumber].red <= openedRoomList[roomNumber].blue
                ? "red"
                : "blue";
        openedRoomList[roomNumber][team]++;
        openedRoomList[roomNumber].users[id] = {
            nickname: "",
            top: 0,
            left: 0,
            team: team,
            isAdmin: users.length == 1 ? true : false,
            isReady: false,
            health: 100,
            attacked: false,
            getHitted: 0,
        };
        io.to(roomNumber).emit(
            "joinSuccess",
            id,
            Object.entries(openedRoomList[roomNumber].users)
        );
        socket.on("setNickname", (id, nickname) => {
            openedRoomList[roomNumber].users[id].nickname = nickname;
            io.to(roomNumber).emit("updateNickname", id, nickname);
            console.log("setnickname");
        });
        socket.on("setLocation", (id, location) => {
            openedRoomList[roomNumber].users[id].top = location.top;
            openedRoomList[roomNumber].users[id].left = location.left;
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
            if (openedRoomList[roomNumber].users[id].isAdmin) {
                //방장으로부터 발생한 ready일시 게임시작
                openedRoomList[roomNumber].isGaming = true;
                Object.keys(openedRoomList[roomNumber].users).map((id) => {
                    if (openedRoomList[roomNumber].users[id].team == "red")
                        openedRoomList[roomNumber].users[id].left = -150;
                    else openedRoomList[roomNumber].users[id].left = 1345;
                    openedRoomList[roomNumber].users[id].top = 700;
                });
                io.to(roomNumber).emit(
                    "gameStart",
                    Object.entries(openedRoomList[roomNumber].users)
                );
            } else {
                openedRoomList[roomNumber].users[id].isReady = isReady;
                io.to(roomNumber).emit("ready", id, isReady);
                console.log("test2");
            }
        });
        socket.on("attack", (id) => {
            if (!openedRoomList[roomNumber].isGaming) {
                io.to(roomNumber).emit("hit", id, []);
                return;
            }
            let attackerLocation = {
                top: openedRoomList[roomNumber].users[id].top + 25,
                left: openedRoomList[roomNumber].users[id].left + 25,
            }; //25 더해주는 이유는 캐릭터의 정중앙
            let enemy = Object.keys(openedRoomList[roomNumber].users);
            enemy = enemy.filter(
                (userId) =>
                    openedRoomList[roomNumber].users[id].team !==
                    openedRoomList[roomNumber].users[userId].team
            );
            let allEnemy = [...enemy];
            //공격 범위 내 있는 상대편 유저만 필터링
            enemy = enemy.filter((userId) => {
                let topDistance =
                    Math.max(
                        attackerLocation.top,
                        openedRoomList[roomNumber].users[userId].top + 25
                    ) -
                    Math.min(
                        attackerLocation.top,
                        openedRoomList[roomNumber].users[userId].top + 25
                    );
                let sideDistance =
                    Math.max(
                        attackerLocation.left,
                        openedRoomList[roomNumber].users[userId].left + 25
                    ) -
                    Math.min(
                        attackerLocation.left,
                        openedRoomList[roomNumber].users[userId].left + 25
                    );
                const distanceAdvice =
                    25 +
                    Math.min(
                        (Math.min(topDistance, sideDistance) / 90) * 10,
                        10.3553
                    );
                if (
                    Math.sqrt(topDistance ** 2 + sideDistance ** 2) -
                        distanceAdvice <=
                    90
                )
                    return true;
                else return false;
            });
            //공격 범위 내 있는 상대편 유저만 필터링
            enemy.map((userId) => {
                openedRoomList[roomNumber].users[userId].health -= 20;
            });
            io.to(roomNumber).emit("hit", id, enemy);
            console.log(allEnemy);
            //살아있는 상대편 유저만 필터링
            allEnemy = allEnemy.filter(
                (userId) => openedRoomList[roomNumber].users[userId].health > 0
            );
            //살아있는 상대편 유저만 필터링
            console.log(allEnemy);
            //살아있는 상대가 없으면 게임 종료 처리
            if (allEnemy.length == 0) {
                respawn(roomNumber);
                setTimeout(() => {
                    io.to(roomNumber).emit(
                        "gameEnd",
                        openedRoomList[roomNumber].users[id].team
                    );
                }, 3000);
            }
            //살아있는 상대가 없으면 게임 종료 처리
        });
        socket.on("disconnect", () => {
            socket.leave(roomNumber);
            let outUserId = "";
            let outUserTeam = "";
            let users = Array.from(
                io.sockets.adapter.rooms.get(roomNumber) || []
            );
            if (users.length == 0) {
                delete openedRoomList[roomNumber];
                return;
            }
            Object.keys(openedRoomList[roomNumber].users).map((userId) => {
                if (!users.includes(userId)) {
                    outUserId = userId;
                    outUserTeam = openedRoomList[roomNumber].users[userId].team;
                    if (openedRoomList[roomNumber].users[userId].isAdmin) {
                        openedRoomList[roomNumber].users[
                            users[0]
                        ].isAdmin = true;
                        io.to(roomNumber).emit("adminChange", users[0]);
                    }
                    delete openedRoomList[roomNumber].users[userId];
                }
            });
            io.to(roomNumber).emit("goOut", outUserId);
            if (openedRoomList[roomNumber].isGaming) {
                let isGameEnd = true;
                Object.keys(openedRoomList[roomNumber].users).map((userId) => {
                    if (
                        openedRoomList[roomNumber].users[userId].team ==
                            outUserTeam &&
                        openedRoomList[roomNumber].users[userId].health > 0
                    )
                        isGameEnd = false;
                });
                if (isGameEnd) {
                    respawn(roomNumber);
                    setTimeout(() => {
                        io.to(roomNumber).emit(
                            "gameEnd",
                            outUserTeam == "blue" ? "red" : "blue"
                        );
                    }, 3000);
                }
            }
            openedRoomList[roomNumber][outUserTeam] -= 1;
        });
    });
});

server.listen(app.get("port"), () => {
    console.log("isRunning on 5000");
});
