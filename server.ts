import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

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

  // Game State
  const players: Record<string, { x: number, y: number, color: string, score: number, name: string }> = {};
  let coin = { x: Math.random(), y: Math.random(), id: uuidv4() };

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("join", (name: string) => {
      players[socket.id] = {
        x: Math.random(),
        y: Math.random(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        score: 0,
        name: name || "Player"
      };
      
      // Send current state to the new player
      socket.emit("init", { players, coin, id: socket.id });
      // Notify others
      socket.broadcast.emit("playerJoined", { id: socket.id, player: players[socket.id] });
    });

    socket.on("move", (data: { x: number, y: number }) => {
      if (players[socket.id]) {
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        socket.broadcast.emit("playerMoved", { id: socket.id, x: data.x, y: data.y });
      }
    });

    socket.on("collectCoin", (coinId: string) => {
      if (coin.id === coinId && players[socket.id]) {
        players[socket.id].score += 1;
        // Generate new coin
        coin = { x: Math.random(), y: Math.random(), id: uuidv4() };
        io.emit("coinCollected", { playerId: socket.id, newCoin: coin, score: players[socket.id].score });
      }
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
      delete players[socket.id];
      io.emit("playerLeft", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
