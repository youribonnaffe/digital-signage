'use strict';

const express = require('express');
const app = express();
app.use(express.static('public'));

const server = require('http').Server(app);
const io = require('socket.io')(server);

/**
 * TODO
 *
 * TODO read documentation for plain JS modules and such, and templating and nodejs/express
 *
 *
 * Channel -> customer (i.e multi tenancy)
 * Rooms -> XX_admins / XX_clients
 *
 * Clients connects, joins clients rooms and his room (needed?), retrieve existing URL, listen to URL change
 * Admin connects, joins rooms, retrieve existing clients, listen to new clients
 *
 * Client has id, network name, url and an admin
 * Admin has id, network and clients
 *
 * Multiple admins is possible
 *
 * Clients shows its view, with debug window
 *
 * Admin shows all clients (vignette mode, with auto layout, sorted by name)
 */

io.on('connection', (socket) => {
    socket.on('url', (msg) => {
        socket.broadcast.to(msg.name).emit('url', msg);
    });

    // store clients somewhere
    socket.on('admin', (msg) => {
        io.clients((error, clients) => {
            console.log(clients);
            io.emit('clients', clients);
        });
    });

    socket.on('join', (msg) => {
        socket.join(msg);
        socket.join("clients");
        io.emit('joined', msg);
    });
});

if (module === require.main) {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`);
        console.log('Press Ctrl+C to quit.');
    });
}
