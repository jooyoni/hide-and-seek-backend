const express = require('express');
var cors = require('cors');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(cors());
app.set('port', process.env.PORT || 5000);
// app.get("/", (req, res) => {
//     res.send({ data: "hi" });
// });

const openedRoomList = {};

app.post('/create-room', (req, res) => {
  const roomNumber = Math.floor(Math.random() * 100000);
  // const id = String(Math.floor(Math.random() * 10000000));
  openedRoomList.roomNumber = {
    users: {},
  };
  // openedRoomList.roomNumber.users[id] = { nickname: '' };
  res.send({ roomNumber, success: true });
});

io.on('connection', function (socket) {
  socket.on('joinRoom', async (roomNumber) => {
    if (!openedRoomList[roomNumber]) socket.leave();
    await socket.join(roomNumber);
    let users = Array.from(io.sockets.adapter.rooms.get(roomNumber));
    let id = users[users.length - 1];
    openedRoomList.roomNumber.users[id] = {
      nickname: '',
    };
    io.to(roomNumber).emit(
      'joinSuccess',
      id,
      Object.entries(openedRoomList.roomNumber.users),
    );
    socket.on('setNickname', (id, nickname) => {
      openedRoomList.roomNumber.users[id] = {
        nickname: nickname,
      };
      console.log('setnickname');
    });
    socket.on('chat', (id, chat) => {
      console.log(io.sockets.client);
      io.to(roomNumber).emit('chat', id, chat);
    });
    socket.on('disconnect', () => {
      socket.leave(roomNumber);
    });
  });
});

server.listen(app.get('port'), () => {
  console.log('isRunning on 5000');
});
