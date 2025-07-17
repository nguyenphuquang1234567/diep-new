const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const compression = require('compression');

const app = express();

// Enable compression for all responses
app.use(compression());

// Optimize server for low latency
const server = http.createServer(app);

// Optimize server for low latency
const io = new Server(server, {
    transports: ['websocket'], // Force WebSocket only, no polling
    pingTimeout: 5000,
    pingInterval: 1000,
    maxHttpBufferSize: 124024, // 1MB buffer
    allowEIO3: true,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Additional optimizations
    perMessageDeflate: {
        threshold: 1024,
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        zlibDeflateOptions: {
            level: 6
        }
    }
});

// Serve static files (your game) from the current directory
app.use(express.static(__dirname));

// Game state
let players = {};
let lastState = null;
let hostId = null;

// Connection pooling for better performance
const connectionPool = new Map();

// Optimize for low latency
io.engine.on('connection_error', (err) => {
    console.log('Connection error:', err);
});

io.on('connection', (socket) => {
    // Set socket options for low latency
    socket.conn.transport.writable = true;
    
    // Add to connection pool
    connectionPool.set(socket.id, {
        connected: Date.now(),
        lastActivity: Date.now()
    });
    
    // Assign player color
    let color = Object.keys(players).length === 0 ? 'red' : 'blue';
    players[socket.id] = { color, inputs: {} };
    socket.emit('playerColor', color);
    console.log(`Player ${color} connected: ${socket.id}`);

    // Assign host if not set
    if (!hostId) {
        hostId = socket.id;
        io.emit('hostId', hostId);
        console.log(`Host assigned: ${hostId}`);
    } else {
        socket.emit('hostId', hostId);
    }

    // Relay input from viewers to host with minimal processing
    socket.on('playerInput', (data) => {
        if (socket.id !== hostId && hostId) {
            // Update activity timestamp
            const poolEntry = connectionPool.get(socket.id);
            if (poolEntry) poolEntry.lastActivity = Date.now();
            
            // Direct relay without processing
            io.to(hostId).emit('viewerInput', { socketId: socket.id, data });
        }
    });

    // Relay game state from host to all viewers with compression
    socket.on('gameState', (state) => {
        if (socket.id === hostId) {
            // Update activity timestamp
            const poolEntry = connectionPool.get(socket.id);
            if (poolEntry) poolEntry.lastActivity = Date.now();
            
            // Broadcast immediately without processing
            socket.broadcast.emit('gameState', state);
        }
    });

    io.emit('playerCount', Object.keys(players).length);

    socket.on('disconnect', () => {
        console.log(`Player ${players[socket.id]?.color || 'unknown'} disconnected: ${socket.id}`);
        delete players[socket.id];
        connectionPool.delete(socket.id);
        
        if (socket.id === hostId) {
            // Host left, pick a new host if any players remain
            const ids = Object.keys(players);
            hostId = ids.length > 0 ? ids[0] : null;
            io.emit('hostId', hostId);
            console.log(`Host changed to: ${hostId}`);
        }
        io.emit('playerDisconnected');
        io.emit('playerCount', Object.keys(players).length);
    });
});

// Clean up inactive connections every 30 seconds
setInterval(() => {
    const now = Date.now();
    for (const [socketId, entry] of connectionPool.entries()) {
        if (now - entry.lastActivity > 30000) { // 30 seconds
            const socket = io.sockets.sockets.get(socketId);
            if (socket) socket.disconnect();
            connectionPool.delete(socketId);
        }
    }
}, 30000);

// Optimize server performance
server.keepAliveTimeout = 3000;
server.headersTimeout = 35000;
// Set TCP options for low latency
server.on('connection', (socket) => {
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 1000);
});

server.listen(3000, () => {
    console.log('Tank game server running on http://localhost:3000');
    console.log('Optimized for low latency (target: 10ms)');
    console.log('Features: WebSocket-only, compression, delta updates, prediction');
}); 