import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Socket.io logic
  const rooms = new Map<string, { players: any[], seed: number, level: string, started: boolean }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (roomId: string, playerInfo: any) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { players: [], seed: Math.floor(Math.random() * 1000000), level: 'easy', started: false });
      }
      const room = rooms.get(roomId)!;
      
      // Remove existing player if rejoining
      room.players = room.players.filter(p => p.id !== socket.id);
      room.players.push({ id: socket.id, ...playerInfo, ready: false });
      
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('leaveRoom', (roomId: string) => {
      socket.leave(roomId);
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('roomUpdate', room);
        }
      }
    });

    socket.on('setReady', (roomId: string, ready: boolean) => {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.ready = ready;
          io.to(roomId).emit('roomUpdate', room);

          // Check if all players are ready
          if (room.players.length > 0 && room.players.every(p => p.ready)) {
            room.started = true;
            room.seed = Math.floor(Math.random() * 1000000); // New seed for each game
            io.to(roomId).emit('gameStart', { seed: room.seed, level: room.level });
          }
        }
      }
    });
    
    socket.on('setLevel', (roomId: string, level: string) => {
      const room = rooms.get(roomId);
      if (room && !room.started) {
        room.level = level;
        io.to(roomId).emit('roomUpdate', room);
      }
    });

    socket.on('playerUpdate', (roomId: string, playerData: any) => {
      // Broadcast player position and state to other players in the room
      socket.to(roomId).emit('playerUpdate', { id: socket.id, ...playerData });
    });

    socket.on('playerCrashed', (roomId: string) => {
      socket.to(roomId).emit('playerCrashed', socket.id);
    });
    
    socket.on('playerVictory', (roomId: string, score: number) => {
      socket.to(roomId).emit('playerVictory', { id: socket.id, score });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove from all rooms
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit('roomUpdate', room);
            io.to(roomId).emit('playerDisconnected', socket.id);
          }
        }
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
