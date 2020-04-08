'use strict';

const express = require('express');
const app = express();
app.use(express.static('public'));

const server = require('http').Server(app);
const io = require('socket.io')(server);

const {Datastore} = require('@google-cloud/datastore');

/**
 * TODO
 *
 * TODO read documentation for plain JS modules and such, and templating and nodejs/express
 *
 * Channel -> customer (i.e multi tenancy)
 * Rooms -> XX_admins / XX_clients
 *
 *
 * Client has id, network name, url and an admin
 * Admin has id, network and clients
 *
 *
 * Reconnection / disconnection
 * Remove client (to purge old and for tests)
 * Handling of multiple networks
 *
 * CLEANUP
 *
 * Add security
 *
 * Publish on Github
 * Deploy it on GAE
 */

const datastore = new Datastore();

const upsertClient = (client) => {
  return datastore.upsert({
    key: datastore.key(['client', client.name]),
    data: client,
  });
};

const getClient = (id) => {
  return datastore
    .get(datastore.key(['client', id]));
};

const getClients = () => {
  const query = datastore
    .createQuery('client');

  return datastore.runQuery(query);
};

io.on('connection', (socket) => {

  socket.on('reconnect', (msg) => {
    console.log('Reconnection ' + msg);
  });

  socket.on('url', async (msg) => {
    console.log(msg);

    await upsertClient(msg);

    socket.broadcast.to(`${msg.network}_${msg.name}`).emit('url', msg);
    io.in(`${msg.network}_admin`).emit('url', msg);
  });

  // store clients somewhere
  socket.on('admin', async (msg, callback) => {
    socket.join(`${msg.network}_admin`);

    const [clients] = await getClients();
    console.log(clients);

    console.log(`Admin ${msg.name} joined ${msg.network}`);

    callback(clients);
  });

  socket.on('join', async (msg, callback) => {

    const [client] = await getClient(msg.name);
    if (!client) {
      await upsertClient(msg);
    }

    socket.join(`${msg.network}_${msg.name}`);
    socket.broadcast.to(`${msg.network}_admin`).emit('joined', msg);

    console.log(`Client ${msg.name} joined ${msg.network}`);

    if (client.url) {
      callback({url: client.url});
    }
  });
});

if (module === require.main) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}
