// server.js
// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: { 
    origin: "http://localhost:3000", // React app URL
    methods: ["GET", "POST"] 
  }
});

const rooms = new Map(); // roomId -> [socketId1, socketId2]

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join a consultation room
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    
    // Track room members
    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
    }
    rooms.get(roomId).push({ socketId: socket.id, userId });

    console.log(`👤 User ${userId} joined room ${roomId}`);
    console.log(`📊 Room ${roomId} now has ${rooms.get(roomId).length} members`);

    // Notify others in the room
    socket.to(roomId).emit('user-connected', userId);
  });

  // WebRTC signaling - offer
  socket.on('offer', (offer, roomId) => {
    console.log(`📤 Sending offer to room ${roomId}`);
    socket.to(roomId).emit('offer', offer);
  });

  // WebRTC signaling - answer
  socket.on('answer', (answer, roomId) => {
    console.log(`📥 Sending answer to room ${roomId}`);
    socket.to(roomId).emit('answer', answer);
  });

  // WebRTC signaling - ICE candidate
  socket.on('ice-candidate', (candidate, roomId) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    
    // Clean up rooms
    rooms.forEach((members, roomId) => {
      const index = members.findIndex(m => m.socketId === socket.id);
      if (index > -1) {
        members.splice(index, 1);
        console.log(`📊 Room ${roomId} now has ${members.length} members`);
        
        // Delete empty rooms
        if (members.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️  Room ${roomId} deleted (empty)`);
        }
      }
    });
  });

  // Get room info (optional - for debugging)
  socket.on('get-room-info', (roomId) => {
    const roomMembers = rooms.get(roomId) || [];
    socket.emit('room-info', { roomId, memberCount: roomMembers.length });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
  console.log(`📡 Waiting for connections...`);
});