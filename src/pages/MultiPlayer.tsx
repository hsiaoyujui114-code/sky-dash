import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Users, Trophy, Loader2 } from "lucide-react";
import { io, Socket } from "socket.io-client";

type Player = {
  x: number;
  y: number;
  color: string;
  score: number;
  name: string;
};

type GameState = {
  players: Record<string, Player>;
  coin: { x: number; y: number; id: string };
  id: string;
};

export default function MultiPlayer() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const myIdRef = useRef<string>("");

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setStatus("connected");
    });

    newSocket.on("disconnect", () => {
      setStatus("disconnected");
      setHasJoined(false);
    });

    newSocket.on("init", (data: GameState) => {
      setGameState(data);
      myIdRef.current = data.id;
      setHasJoined(true);
    });

    newSocket.on("playerJoined", ({ id, player }: { id: string; player: Player }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: { ...prev.players, [id]: player },
        };
      });
    });

    newSocket.on("playerMoved", ({ id, x, y }: { id: string; x: number; y: number }) => {
      setGameState((prev) => {
        if (!prev || !prev.players[id]) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [id]: { ...prev.players[id], x, y },
          },
        };
      });
    });

    newSocket.on("coinCollected", ({ playerId, newCoin, score }: { playerId: string; newCoin: any; score: number }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const newPlayers = { ...prev.players };
        if (newPlayers[playerId]) {
          newPlayers[playerId].score = score;
        }
        return {
          ...prev,
          coin: newCoin,
          players: newPlayers,
        };
      });
    });

    newSocket.on("playerLeft", (id: string) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const newPlayers = { ...prev.players };
        delete newPlayers[id];
        return {
          ...prev,
          players: newPlayers,
        };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && playerName.trim()) {
      socket.emit("join", playerName.trim());
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!hasJoined || !gameState || !socket || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    // Update local state immediately for smooth movement
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [myIdRef.current]: { ...prev.players[myIdRef.current], x, y }
        }
      };
    });

    // Emit movement to server
    socket.emit("move", { x, y });

    // Check collision with coin locally
    const dx = (x - gameState.coin.x) * rect.width;
    const dy = (y - gameState.coin.y) * rect.height;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 20 + 15) { // player radius 20, coin radius 15
      socket.emit("collectCoin", gameState.coin.id);
    }
  };

  // Sort players by score
  const sortedPlayers = gameState 
    ? (Object.entries(gameState.players) as [string, Player][]).sort((a, b) => b[1].score - a[1].score)
    : ([] as [string, Player][]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md z-20">
        <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm">
            <Users className="w-4 h-4" />
            <span>{sortedPlayers.length} Online</span>
          </div>
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        {/* Leaderboard Sidebar */}
        {hasJoined && (
          <div className="w-full md:w-64 bg-zinc-900/80 border-r border-zinc-800 p-4 flex flex-col z-10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Leaderboard
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {sortedPlayers.map(([id, player], index) => (
                <div 
                  key={id} 
                  className={`flex items-center justify-between p-3 rounded-xl border ${id === myIdRef.current ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900/50 border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-xs font-mono w-4">{index + 1}.</span>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }} />
                    <span className={`font-medium text-sm truncate max-w-[100px] ${id === myIdRef.current ? 'text-white' : 'text-zinc-300'}`}>
                      {player.name}
                    </span>
                  </div>
                  <span className="font-mono text-indigo-400 font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Area */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          {!hasJoined ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center z-10"
            >
              <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Multiplayer Arena</h2>
              <p className="text-zinc-400 mb-8">Join the arena and compete against others in real-time.</p>
              
              {status === "connecting" ? (
                <div className="flex items-center justify-center gap-3 text-zinc-400 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to server...</span>
                </div>
              ) : (
                <form onSubmit={joinGame} className="space-y-4">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your nickname"
                    maxLength={12}
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!playerName.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Join Arena
                  </button>
                </form>
              )}
            </motion.div>
          ) : (
            <div 
              ref={containerRef}
              className="absolute inset-4 border-2 border-zinc-800 rounded-3xl overflow-hidden cursor-none"
              onMouseMove={handleMouseMove}
              onTouchMove={handleMouseMove}
            >
              {gameState && (
                <>
                  {/* Coin */}
                  <div 
                    className="absolute bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-300"
                    style={{
                      width: 30,
                      height: 30,
                      left: `calc(${gameState.coin.x * 100}% - 15px)`,
                      top: `calc(${gameState.coin.y * 100}% - 15px)`,
                    }}
                  />
                  
                  {/* Players */}
                  {(Object.entries(gameState.players) as [string, Player][]).map(([id, player]) => (
                    <div 
                      key={id}
                      className="absolute pointer-events-none flex flex-col items-center"
                      style={{
                        left: `${player.x * 100}%`,
                        top: `${player.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        transition: id === myIdRef.current ? 'none' : 'left 0.1s linear, top 0.1s linear'
                      }}
                    >
                      <span className="text-[10px] font-bold text-white/70 mb-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">
                        {player.name}
                      </span>
                      <div 
                        className="w-10 h-10 rounded-lg shadow-lg"
                        style={{ 
                          backgroundColor: player.color,
                          boxShadow: `0 0 20px ${player.color}80`,
                          border: id === myIdRef.current ? '2px solid white' : 'none'
                        }}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
