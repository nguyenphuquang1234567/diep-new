const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (your game) from the current directory
app.use(express.static(__dirname));

// Game state
let players = {};
let lastState = null;

io.on('connection', (socket) => {
    // Assign player color
    let color = Object.keys(players).length === 0 ? 'red' : 'blue';
    players[socket.id] = { color, inputs: {} };
    socket.emit('playerColor', color);
    console.log(`Player ${color} connected: ${socket.id}`);

    // Receive player input
    socket.on('playerInput', (input) => {
        if (players[socket.id]) {
            players[socket.id].inputs = input;
        }
    });

    // Receive game state from a client (authoritative client model)
    socket.on('gameState', (state) => {
        lastState = state;
        socket.broadcast.emit('gameState', state);
    });

    socket.on('disconnect', () => {
        console.log(`Player ${players[socket.id]?.color || 'unknown'} disconnected: ${socket.id}`);
        delete players[socket.id];
        // Optionally notify clients to reset
        io.emit('playerDisconnected');
    });
});

server.listen(3000, () => {
    console.log('Tank game server running on http://localhost:3000');
}); 