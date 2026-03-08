import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Trophy, Clock } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard";

export default function SinglePlayer() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [coin, setCoin] = useState({ x: 400, y: 300 });
  const [playerPos, setPlayerPos] = useState({ x: 100, y: 100 });
  const containerRef = useRef<HTMLDivElement>(null);

  const difficultySettings = {
    easy: { time: 60, coinSize: 40, playerSpeed: 0.1 },
    medium: { time: 45, coinSize: 30, playerSpeed: 0.15 },
    hard: { time: 30, coinSize: 20, playerSpeed: 0.2 },
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(difficultySettings[difficulty].time);
    setGameState("playing");
    spawnCoin();
  };

  const spawnCoin = () => {
    setCoin({
      x: Math.random() * 0.9 + 0.05,
      y: Math.random() * 0.9 + 0.05,
    });
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== "playing" || !containerRef.current) return;
    
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
    
    setPlayerPos({ x, y });

    // Check collision
    const dx = (x - coin.x) * rect.width;
    const dy = (y - coin.y) * rect.height;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Player size is 40 (radius 20), coin size depends on difficulty
    if (distance < 20 + difficultySettings[difficulty].coinSize / 2) {
      setScore(s => s + 1);
      spawnCoin();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xl">
            <Trophy className="w-5 h-5" />
            <span>{score}</span>
          </div>
          <div className={`flex items-center gap-2 font-mono text-xl ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-zinc-300'}`}>
            <Clock className="w-5 h-5" />
            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {gameState === "menu" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center z-10"
          >
            <h2 className="text-3xl font-bold mb-6">Single Player</h2>
            
            <div className="space-y-4 mb-8">
              <p className="text-zinc-400 text-sm uppercase tracking-wider font-semibold mb-2">Select Difficulty</p>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`w-full py-3 px-4 rounded-xl border transition-all ${
                    difficulty === d 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="capitalize font-medium">{d}</span>
                    <span className="text-xs opacity-60">{difficultySettings[d].time}s</span>
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Start Game
            </button>
          </motion.div>
        )}

        {gameState === "gameover" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center z-10"
          >
            <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Time's Up!</h2>
            <p className="text-zinc-400 mb-8">You collected <span className="text-white font-bold text-xl">{score}</span> stars on {difficulty} difficulty.</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setGameState("menu")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Menu
              </button>
              <button 
                onClick={startGame}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Play Again
              </button>
            </div>
          </motion.div>
        )}

        {/* Game Arena */}
        <div 
          ref={containerRef}
          className={`absolute inset-4 border-2 border-zinc-800 rounded-3xl overflow-hidden ${gameState === 'playing' ? 'cursor-none' : 'pointer-events-none opacity-20'}`}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          {gameState === 'playing' && (
            <>
              {/* Coin */}
              <div 
                className="absolute bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-300"
                style={{
                  width: difficultySettings[difficulty].coinSize,
                  height: difficultySettings[difficulty].coinSize,
                  left: `calc(${coin.x * 100}% - ${difficultySettings[difficulty].coinSize / 2}px)`,
                  top: `calc(${coin.y * 100}% - ${difficultySettings[difficulty].coinSize / 2}px)`,
                }}
              />
              
              {/* Player */}
              <div 
                className="absolute w-10 h-10 bg-indigo-500 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] pointer-events-none"
                style={{
                  left: `calc(${playerPos.x * 100}% - 20px)`,
                  top: `calc(${playerPos.y * 100}% - 20px)`,
                  transition: 'left 0.05s linear, top 0.05s linear'
                }}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
