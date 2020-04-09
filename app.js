'use strict';

const express = require('express');
const app = express();

app.use(express.static('public'));

const server = require('http').Server(app);
const io = require('socket.io')(server);

const data = require('./data.js');
const repository = new data.Repository();

io.on('connection', (socket) => {
  // A client joined, we send it back its known URL and let admins know
  socket.on('join', async (msg, callback) => {
    const client = await repository.clientJoined({
      network: msg.network,
      name: msg.name,
      socket: socket.id,
    });

    socket.join(`${msg.network}_${msg.name}`);
    socket.broadcast.to(`${msg.network}_admin`).emit('admin_client_joined', client);

    console.log(`Client ${msg.name} joined ${msg.network}`);

    if (client.url) {
      callback({url: client.url});
    }
  });

  // A client disconnects, we remove it from admin pages
  socket.on('disconnect', async () => {
    console.log(`Client ${socket.id} left`);

    const client = await repository.clientLeft({
      socket: socket.id,
    });

    if (client) { // might not be a client, could be an admin
      socket.broadcast.to(`${client.network}_admin`).emit('admin_left', client);
    }
  });

  // An admin changed a client's URL
  socket.on('admin_url', async (msg) => {
    await repository.updateClientUrl({
      network: msg.network,
      name: msg.name,
      url: msg.url,
    });

    socket.broadcast.to(`${msg.network}_${msg.name}`).emit('url', msg);
    io.in(`${msg.network}_admin`).emit('admin_url', msg);

    console.log(`Url changed to ${msg}`);
  });

  // An admin joined the network, we send it the connected clients
  socket.on('admin_join', async (msg, callback) => {
    socket.join(`${msg.network}_admin`);

    console.log(`Admin ${socket.id} joined ${msg.network}`);

    const [clients] = await repository.getUpClients(msg.network);
    console.log(clients);
    callback(clients
      .map(({name, url, network}) => {
        return {name, url, network};
      }));
  });
});

if (module === require.main) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}
