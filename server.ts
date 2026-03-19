import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

const MULTIPLAYER_GOAL = 10000; // Distance to win

interface Player {
  id: string;
  name: string;
  progress: number;
  y: number;
  trophies: number;
  isFinished: boolean;
  color: string;
}

interface Room {
  id: string;
  players: Record<string, Player>;
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  startTime?: number;
}

const rooms: Record<string, Room> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", ({ roomId, name, color }) => {
      socket.join(roomId);
      
      if (!rooms[roomId]) {
        rooms[roomId] = {
          id: roomId,
          players: {},
          status: 'waiting'
        };
      }

      rooms[roomId].players[socket.id] = {
        id: socket.id,
        name: name || `Player ${Math.floor(Math.random() * 1000)}`,
        progress: 0,
        y: 300,
        trophies: 0,
        isFinished: false,
        color: color || '#4285F4'
      };

      io.to(roomId).emit("room_state", rooms[roomId]);
    });

    socket.on("start_game", (roomId) => {
      if (rooms[roomId] && rooms[roomId].status === 'waiting') {
        rooms[roomId].status = 'playing';
        rooms[roomId].startTime = Date.now() + 3000; // 3 seconds countdown
        io.to(roomId).emit("game_started", { startTime: rooms[roomId].startTime });
      }
    });

    socket.on("update_state", ({ roomId, progress, y, trophies }) => {
      const room = rooms[roomId];
      if (room && room.status === 'playing' && room.players[socket.id]) {
        const player = room.players[socket.id];
        player.progress = progress;
        player.y = y;
        player.trophies = trophies;

        // Check win condition
        if (progress >= MULTIPLAYER_GOAL && !player.isFinished) {
          player.isFinished = true;
          
          if (!room.winner) {
            room.status = 'finished';
            
            // Calculate final scores: Progress + (Trophies * 1000)
            let highestScore = -1;
            let winnerId = socket.id;
            
            for (const pid in room.players) {
              const p = room.players[pid];
              const finalScore = p.progress + (p.trophies * 1000);
              if (finalScore > highestScore) {
                highestScore = finalScore;
                winnerId = pid;
              }
            }
            
            room.winner = winnerId;
            io.to(roomId).emit("game_over", { winner: room.winner, players: room.players });
          }
        }

        // Broadcast updated state to others in the room
        socket.to(roomId).emit("player_updated", {
          id: socket.id,
          progress,
          y,
          trophies
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Remove player from rooms
      for (const roomId in rooms) {
        if (rooms[roomId].players[socket.id]) {
          delete rooms[roomId].players[socket.id];
          if (Object.keys(rooms[roomId].players).length === 0) {
            delete rooms[roomId];
          } else {
            io.to(roomId).emit("room_state", rooms[roomId]);
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
