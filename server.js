const express = require('express');
var cors = require('cors');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(cors());
app.set('port', process.env.PORT || 5000);
app.get('/', (req, res) => {
  res.send({ data: 'hi' });
});

io.sockets.on('connection', function (socket) {
  console.log('conntected');
  socket.on('receivetest', (data) => {
    console.log('received!!!!', data);
    io.emit('message', data);
  });
});

server.listen(app.get('port'), () => {
  console.log('isRunning on 5000');
});
