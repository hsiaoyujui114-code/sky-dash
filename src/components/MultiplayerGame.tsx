import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Shield, Zap, Star, Crosshair, Play, RotateCcw, Users, X, Flag, ChevronRight, Plane } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const THRUST = -1.2;
const MAX_FALL_SPEED = 10;
const MAX_RISE_SPEED = -8;

type GameState = 'start' | 'playing' | 'gameover' | 'victory' | 'multiplayer_lobby' | 'history' | 'ship_select';
type ItemType = 'coin' | 'shield' | 'boost' | 'double_score' | 'weapon';
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type ShipType = 'classic' | 'stealth' | 'saucer' | 'blocky';

interface LevelConfig {
  id: Difficulty;
  name: string;
  baseSpeed: number;
  obstacleFrequency: number;
  distanceToGoal: number;
  color: string;
}

const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { id: 'easy', name: 'Easy', baseSpeed: 4, obstacleFrequency: 60, distanceToGoal: 2000, color: 'text-green-400' },
  medium: { id: 'medium', name: 'Medium', baseSpeed: 6, obstacleFrequency: 45, distanceToGoal: 3000, color: 'text-yellow-400' },
  hard: { id: 'hard', name: 'Hard', baseSpeed: 8, obstacleFrequency: 30, distanceToGoal: 4000, color: 'text-orange-400' },
  expert: { id: 'expert', name: 'Expert', baseSpeed: 10, obstacleFrequency: 20, distanceToGoal: 5000, color: 'text-red-500' },
};

interface ShipConfig {
  id: ShipType;
  name: string;
  baseColor: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, isThrusting: boolean, boost: boolean) => void;
}

const SHIPS: Record<ShipType, ShipConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Dart',
    baseColor: '#10b981',
    width: 40,
    height: 30,
    draw: (ctx, w, h, color, thrusting, boost) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(-w / 4, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.closePath();
      ctx.fill();

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        const flameLength = boost ? 25 : 15;
        ctx.moveTo(-w / 4, 0);
        ctx.lineTo(-w / 2 - Math.random() * flameLength - 5, 0);
        ctx.lineTo(-w / 2, 5);
        ctx.moveTo(-w / 4, 0);
        ctx.lineTo(-w / 2 - Math.random() * flameLength - 5, 0);
        ctx.lineTo(-w / 2, -5);
        ctx.stroke();
      }
    }
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth Wing',
    baseColor: '#6366f1',
    width: 45,
    height: 20,
    draw: (ctx, w, h, color, thrusting, boost) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(-w / 3, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.closePath();
      ctx.fill();
      
      // Cockpit
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(w/6, 0, w/6, h/6, 0, 0, Math.PI*2);
      ctx.fill();

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        const flameLength = boost ? 30 : 20;
        ctx.moveTo(-w / 3, 0);
        ctx.lineTo(-w / 2 - Math.random() * flameLength - 5, 0);
        ctx.lineTo(-w / 2, 3);
        ctx.moveTo(-w / 3, 0);
        ctx.lineTo(-w / 2 - Math.random() * flameLength - 5, 0);
        ctx.lineTo(-w / 2, -3);
        ctx.stroke();
      }
    }
  },
  saucer: {
    id: 'saucer',
    name: 'UFO Saucer',
    baseColor: '#ec4899',
    width: 36,
    height: 36,
    draw: (ctx, w, h, color, thrusting, boost) => {
      // Dome
      ctx.fillStyle = 'rgba(134, 239, 172, 0.8)';
      ctx.beginPath();
      ctx.arc(0, -h/6, w/3, Math.PI, 0);
      ctx.fill();
      
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w/2, h/4, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Lights
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-w/3, 0, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, h/6, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w/3, 0, 2, 0, Math.PI*2); ctx.fill();

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        const flameLength = boost ? 20 : 10;
        ctx.moveTo(-w/4, h/4);
        ctx.lineTo(-w/4 - Math.random() * flameLength, h/4 + Math.random() * 10);
        ctx.moveTo(0, h/4);
        ctx.lineTo(0 - Math.random() * flameLength, h/4 + Math.random() * 10);
        ctx.moveTo(w/4, h/4);
        ctx.lineTo(w/4 - Math.random() * flameLength, h/4 + Math.random() * 10);
        ctx.stroke();
      }
    }
  },
  blocky: {
    id: 'blocky',
    name: 'Pixel Box',
    baseColor: '#eab308',
    width: 30,
    height: 30,
    draw: (ctx, w, h, color, thrusting, boost) => {
      ctx.fillStyle = color;
      ctx.fillRect(-w/2, -h/2, w, h);
      
      ctx.fillStyle = '#000';
      ctx.fillRect(w/4, -h/4, w/4, h/4); // Eye/Window
      
      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        const flameLength = boost ? 20 : 10;
        ctx.fillRect(-w/2 - flameLength, -h/4, flameLength, h/2);
      }
    }
  }
};

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  color: string;
}

interface RemotePlayer extends Player {
  id: string;
  crashed: boolean;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'top' | 'bottom' | 'floating';
}

interface Item {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: ItemType;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
}

interface ScoreRecord {
  score: number;
  level: string;
  result: 'Victory' | 'Crashed';
  date: string;
}

// Simple Web Audio API sound generator
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('AudioContext not supported or failed to initialize', e);
      return null;
    }
  }
  return sharedAudioCtx;
};

const playSound = (type: 'coin' | 'powerup' | 'shoot' | 'explosion' | 'crash' | 'victory' | 'select') => {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    
    // Resume context if it was suspended (e.g. by browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'powerup') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      osc.frequency.linearRampToValueAtTime(1320, now + 0.2);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'shoot') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'explosion') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'victory') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.2); // C#
      osc.frequency.setValueAtTime(659.25, now + 0.4); // E
      osc.frequency.setValueAtTime(880, now + 0.6);    // A
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
    } else if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    // Ignore audio errors
  }
};

// PRNG for synced random
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export default function MultiplayerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Difficulty>('easy');
  const [currentShip, setCurrentShip] = useState<ShipType>('classic');
  const [progress, setProgress] = useState(0);
  
  // Multiplayer state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const randomRef = useRef<() => number>(Math.random);
  
  const [powerups, setPowerups] = useState({ shield: 0, boost: 0, doubleScore: 0, weapon: 0 });
  
  const requestRef = useRef<number>();
  const isThrusting = useRef(false);
  
  const playerRef = useRef<Player>({
    x: 100,
    y: CANVAS_HEIGHT / 2,
    width: SHIPS['classic'].width,
    height: SHIPS['classic'].height,
    vy: 0,
    color: SHIPS['classic'].baseColor
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  
  const frameCountRef = useRef(0);
  const scoreRef = useRef(0);
  const speedRef = useRef(LEVELS['easy'].baseSpeed);
  const obstacleIdCounter = useRef(0);
  const itemIdCounter = useRef(0);
  const bulletIdCounter = useRef(0);
  
  const powerupsRef = useRef({ shield: 0, boost: 0, doubleScore: 0, weapon: 0 });

  useEffect(() => {
    const savedHistory = localStorage.getItem('skyDashHistoryV2');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setHighScore(Math.max(...parsed.map((r: ScoreRecord) => r.score)));
        }
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    
    const savedShip = localStorage.getItem('skyDashShip');
    if (savedShip && SHIPS[savedShip as ShipType]) {
      setCurrentShip(savedShip as ShipType);
      playerRef.current.width = SHIPS[savedShip as ShipType].width;
      playerRef.current.height = SHIPS[savedShip as ShipType].height;
      playerRef.current.color = SHIPS[savedShip as ShipType].baseColor;
    }
  }, []);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('roomUpdate', (room) => {
      setRoomPlayers(room.players);
      setCurrentLevel(room.level as Difficulty);
    });

    newSocket.on('gameStart', ({ seed, level }) => {
      randomRef.current = mulberry32(seed);
      setCurrentLevel(level as Difficulty);
      startGame(level as Difficulty, true);
    });

    newSocket.on('playerUpdate', (data) => {
      if (!remotePlayersRef.current.has(data.id)) {
        remotePlayersRef.current.set(data.id, {
          id: data.id,
          x: data.x,
          y: data.y,
          width: 40,
          height: 30,
          vy: data.vy,
          color: '#6366f1',
          crashed: false
        });
      } else {
        const p = remotePlayersRef.current.get(data.id)!;
        p.y = data.y;
        p.vy = data.vy;
      }
    });

    newSocket.on('playerCrashed', (id) => {
      const p = remotePlayersRef.current.get(id);
      if (p) {
        p.crashed = true;
        spawnParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 30);
      }
    });

    newSocket.on('playerDisconnected', (id) => {
      remotePlayersRef.current.delete(id);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const selectShip = (shipId: ShipType) => {
    playSound('select');
    setCurrentShip(shipId);
    localStorage.setItem('skyDashShip', shipId);
    playerRef.current.width = SHIPS[shipId].width;
    playerRef.current.height = SHIPS[shipId].height;
    playerRef.current.color = SHIPS[shipId].baseColor;
  };

  const saveScore = (newScore: number, result: 'Victory' | 'Crashed') => {
    if (newScore === 0 && result === 'Crashed') return;
    
    const newRecord: ScoreRecord = {
      score: newScore,
      level: LEVELS[currentLevel].name,
      result,
      date: new Date().toLocaleString()
    };
    
    setHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 100);
      localStorage.setItem('skyDashHistoryV2', JSON.stringify(updated));
      return updated;
    });
  };

  const joinRoom = () => {
    if (socket && roomId) {
      socket.emit('joinRoom', roomId, { name: 'Player' });
      setIsMultiplayer(true);
      setGameState('multiplayer_lobby');
    }
  };

  const toggleReady = () => {
    if (socket && roomId) {
      const newReady = !isReady;
      setIsReady(newReady);
      socket.emit('setReady', roomId, newReady);
    }
  };

  const changeLevel = (level: Difficulty) => {
    if (socket && roomId) {
      socket.emit('setLevel', roomId, level);
    }
  };

  const startGame = (level: Difficulty, fromMultiplayer = false) => {
    if (!fromMultiplayer) {
      randomRef.current = Math.random;
      setIsMultiplayer(false);
    }
    
    setCurrentLevel(level);
    playerRef.current = {
      x: 100,
      y: CANVAS_HEIGHT / 2,
      width: SHIPS[currentShip].width,
      height: SHIPS[currentShip].height,
      vy: 0,
      color: SHIPS[currentShip].baseColor
    };
    
    // Reset remote players
    remotePlayersRef.current.forEach(p => p.crashed = false);
    
    obstaclesRef.current = [];
    itemsRef.current = [];
    particlesRef.current = [];
    bulletsRef.current = [];
    frameCountRef.current = 0;
    scoreRef.current = 0;
    speedRef.current = LEVELS[level].baseSpeed;
    powerupsRef.current = { shield: 0, boost: 0, doubleScore: 0, weapon: 0 };
    setScore(0);
    setProgress(0);
    setPowerups({ shield: 0, boost: 0, doubleScore: 0, weapon: 0 });
    setGameState('playing');
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        maxLife: 20 + Math.random() * 20,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  };

  const update = useCallback(() => {
    if (gameState !== 'playing') return;

    const player = playerRef.current;
    const pUps = powerupsRef.current;
    const config = LEVELS[currentLevel];
    const rand = randomRef.current;
    
    frameCountRef.current++;
    
    if (frameCountRef.current >= config.distanceToGoal) {
      victory();
      return;
    }

    if (frameCountRef.current % 10 === 0) {
      setProgress(Math.min(100, (frameCountRef.current / config.distanceToGoal) * 100));
    }
    
    let powerupsChanged = false;
    if (pUps.shield > 0) { pUps.shield--; powerupsChanged = true; }
    if (pUps.boost > 0) { pUps.boost--; powerupsChanged = true; }
    if (pUps.doubleScore > 0) { pUps.doubleScore--; powerupsChanged = true; }
    if (pUps.weapon > 0) { 
      pUps.weapon--; 
      powerupsChanged = true;
      if (pUps.weapon % 15 === 0) {
        bulletsRef.current.push({
          id: bulletIdCounter.current++,
          x: player.x + player.width,
          y: player.y + player.height / 2 - 2,
          vx: 15,
          width: 20,
          height: 4
        });
        playSound('shoot');
      }
    }

    if (powerupsChanged && frameCountRef.current % 10 === 0) {
      setPowerups({ ...pUps });
    }

    const currentSpeed = speedRef.current + (pUps.boost > 0 ? 10 : 0);

    if (frameCountRef.current % 600 === 0) {
      speedRef.current += 0.2;
    }

    if (frameCountRef.current % 10 === 0) {
      scoreRef.current += (pUps.doubleScore > 0 ? 2 : 1);
      setScore(scoreRef.current);
    }

    const isGracePeriod = frameCountRef.current < 120;

    if (isThrusting.current) {
      player.vy += THRUST;
      if (frameCountRef.current % 3 === 0) {
        particlesRef.current.push({
          x: player.x,
          y: player.y + player.height,
          vx: -currentSpeed + (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          life: 1,
          maxLife: 15,
          color: pUps.boost > 0 ? '#38bdf8' : '#f97316',
          size: Math.random() * 3 + 2,
        });
      }
    } else if (!isGracePeriod) {
      player.vy += GRAVITY;
    } else {
      player.vy *= 0.9;
    }

    player.vy = Math.max(MAX_RISE_SPEED, Math.min(MAX_FALL_SPEED, player.vy));
    player.y += player.vy;

    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
    } else if (player.y + player.height > CANVAS_HEIGHT) {
      player.y = CANVAS_HEIGHT - player.height;
      player.vy = 0;
      if (pUps.shield <= 0 && pUps.boost <= 0 && !isGracePeriod) {
        gameOver();
        return;
      } else if (!isGracePeriod) {
        player.vy = -10;
      }
    }

    // Send position to server
    if (isMultiplayer && socket && frameCountRef.current % 2 === 0) {
      socket.emit('playerUpdate', roomId, { y: player.y, vy: player.vy });
    }

    // Update remote players
    remotePlayersRef.current.forEach(rp => {
      if (!rp.crashed) {
        rp.y += rp.vy;
        if (rp.y < 0) rp.y = 0;
        if (rp.y + rp.height > CANVAS_HEIGHT) rp.y = CANVAS_HEIGHT - rp.height;
      }
    });

    const isNearEnd = frameCountRef.current > config.distanceToGoal - 100;

    // Spawn Obstacles (synced via seeded rand)
    if (!isGracePeriod && !isNearEnd && frameCountRef.current % Math.max(15, config.obstacleFrequency - Math.floor(speedRef.current)) === 0) {
      const typeRand = rand();
      let type: 'top' | 'bottom' | 'floating' = 'floating';
      let width = 40 + rand() * 40;
      let height = 100 + rand() * 150;
      let y = 0;

      if (typeRand < 0.33) {
        type = 'top';
        y = 0;
      } else if (typeRand < 0.66) {
        type = 'bottom';
        y = CANVAS_HEIGHT - height;
      } else {
        type = 'floating';
        height = 40 + rand() * 60;
        y = rand() * (CANVAS_HEIGHT - height);
      }

      obstaclesRef.current.push({
        id: obstacleIdCounter.current++,
        x: CANVAS_WIDTH,
        y, width, height, type,
      });
    }

    // Spawn Items
    if (!isGracePeriod && !isNearEnd && frameCountRef.current % 120 === 0) {
      const r = rand();
      let type: ItemType = 'coin';
      if (r < 0.10) type = 'shield';
      else if (r < 0.20) type = 'boost';
      else if (r < 0.30) type = 'weapon';
      else if (r < 0.45) type = 'double_score';

      itemsRef.current.push({
        id: itemIdCounter.current++,
        x: CANVAS_WIDTH,
        y: 50 + rand() * (CANVAS_HEIGHT - 100),
        radius: 15,
        type,
      });
    }

    // Update Bullets
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const bullet = bulletsRef.current[i];
      bullet.x += bullet.vx;
      let hit = false;
      for (let j = obstaclesRef.current.length - 1; j >= 0; j--) {
        const obs = obstaclesRef.current[j];
        if (
          bullet.x < obs.x + obs.width && bullet.x + bullet.width > obs.x &&
          bullet.y < obs.y + obs.height && bullet.y + bullet.height > obs.y
        ) {
          spawnParticles(obs.x, bullet.y, '#ef4444', 15);
          playSound('explosion');
          obstaclesRef.current.splice(j, 1);
          scoreRef.current += (pUps.doubleScore > 0 ? 100 : 50);
          setScore(scoreRef.current);
          hit = true;
          break;
        }
      }
      if (hit || bullet.x > CANVAS_WIDTH) bulletsRef.current.splice(i, 1);
    }

    // Update Obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= currentSpeed;

      if (
        player.x < obs.x + obs.width && player.x + player.width > obs.x &&
        player.y < obs.y + obs.height && player.y + player.height > obs.y
      ) {
        if (pUps.shield > 0 || pUps.boost > 0) {
          spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ef4444', 30);
          playSound('explosion');
          obstaclesRef.current.splice(i, 1);
          scoreRef.current += (pUps.doubleScore > 0 ? 100 : 50);
          setScore(scoreRef.current);
          if (pUps.shield > 0 && pUps.boost <= 0) {
            pUps.shield = 0;
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#3b82f6', 30);
          }
          continue;
        } else {
          gameOver();
          return;
        }
      }
      if (obs.x + obs.width < 0) obstaclesRef.current.splice(i, 1);
    }

    // Update Items
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      item.x -= currentSpeed;

      const distX = Math.abs(player.x + player.width / 2 - item.x);
      const distY = Math.abs(player.y + player.height / 2 - item.y);

      if (distX < player.width / 2 + item.radius && distY < player.height / 2 + item.radius) {
        if (item.type === 'coin') {
          scoreRef.current += (pUps.doubleScore > 0 ? 200 : 100);
          spawnParticles(item.x, item.y, '#eab308', 15);
          playSound('coin');
        } else {
          playSound('powerup');
          if (item.type === 'shield') pUps.shield = 600;
          else if (item.type === 'boost') pUps.boost = 300;
          else if (item.type === 'double_score') pUps.doubleScore = 600;
          else if (item.type === 'weapon') pUps.weapon = 480;
          setPowerups({ ...pUps });
        }
        setScore(scoreRef.current);
        itemsRef.current.splice(i, 1);
        continue;
      }
      if (item.x + item.radius < 0) itemsRef.current.splice(i, 1);
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.life >= p.maxLife) particlesRef.current.splice(i, 1);
    }

  }, [gameState, currentLevel, isMultiplayer]);

  const gameOver = () => {
    playSound('crash');
    setGameState('gameover');
    saveScore(scoreRef.current, 'Crashed');
    setHighScore(prev => Math.max(prev, scoreRef.current));
    if (isMultiplayer && socket) {
      socket.emit('playerCrashed', roomId);
    }
    spawnParticles(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, '#ef4444', 50);
  };

  const victory = () => {
    playSound('victory');
    setGameState('victory');
    const bonus = LEVELS[currentLevel].distanceToGoal;
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    saveScore(scoreRef.current, 'Victory');
    setHighScore(prev => Math.max(prev, scoreRef.current));
    if (isMultiplayer && socket) {
      socket.emit('playerVictory', roomId, scoreRef.current);
    }
    spawnParticles(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, '#fbbf24', 100);
  };

  const drawShip = (ctx: CanvasRenderingContext2D, p: Player | RemotePlayer, isLocal: boolean) => {
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate(Math.min(Math.max(p.vy * 0.05, -0.5), 0.5));
    
    ctx.fillStyle = p.color;
    if (isLocal && powerupsRef.current.boost > 0) ctx.fillStyle = '#f97316';
    
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    
    if ((p as RemotePlayer).crashed) {
      ctx.globalAlpha = 0.3;
    }

    if (isLocal) {
      SHIPS[currentShip].draw(ctx, p.width, p.height, p.color, isThrusting.current, powerupsRef.current.boost > 0);
    } else {
      // Draw remote players as classic ship for now
      SHIPS['classic'].draw(ctx, p.width, p.height, p.color, false, false);
    }

    ctx.restore();
    
    if (isLocal && powerupsRef.current.shield > 0) {
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, 0.8)`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const currentSpeed = speedRef.current + (powerupsRef.current.boost > 0 ? 10 : 0);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const offset = (frameCountRef.current * currentSpeed) % 100;
    for (let i = -offset; i < CANVAS_WIDTH; i += 100) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
    }

    const config = LEVELS[currentLevel];
    const framesLeft = config.distanceToGoal - frameCountRef.current;
    if (framesLeft < CANVAS_WIDTH / currentSpeed && gameState === 'playing') {
      const goalX = CANVAS_WIDTH - (framesLeft * currentSpeed);
      const squareSize = 20;
      for (let y = 0; y < CANVAS_HEIGHT; y += squareSize) {
        ctx.fillStyle = (y / squareSize) % 2 === 0 ? '#fff' : '#000';
        ctx.fillRect(goalX, y, squareSize, squareSize);
        ctx.fillStyle = (y / squareSize) % 2 === 0 ? '#000' : '#fff';
        ctx.fillRect(goalX + squareSize, y, squareSize, squareSize);
      }
    }

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    bulletsRef.current.forEach(b => {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    obstaclesRef.current.forEach(obs => {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
    });

    itemsRef.current.forEach(item => {
      ctx.beginPath(); ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      if (item.type === 'coin') ctx.fillStyle = '#eab308';
      else if (item.type === 'shield') ctx.fillStyle = '#3b82f6';
      else if (item.type === 'boost') ctx.fillStyle = '#f97316';
      else if (item.type === 'double_score') ctx.fillStyle = '#fbbf24';
      else if (item.type === 'weapon') ctx.fillStyle = '#22c55e';
      ctx.fill();
      
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 14px Arial';
      if (item.type === 'shield') ctx.fillText('S', item.x, item.y);
      if (item.type === 'boost') ctx.fillText('B', item.x, item.y);
      if (item.type === 'double_score') ctx.fillText('2x', item.x, item.y);
      if (item.type === 'weapon') ctx.fillText('W', item.x, item.y);
    });

    // Draw remote players
    remotePlayersRef.current.forEach(rp => {
      drawShip(ctx, rp, false);
    });

    // Draw local player
    if (gameState !== 'gameover' && gameState !== 'victory') {
      drawShip(ctx, playerRef.current, true);
      
      if (gameState === 'playing' && frameCountRef.current < 120) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center'; ctx.font = 'bold 20px Arial';
        ctx.fillText('GET READY!', playerRef.current.x + playerRef.current.width / 2, playerRef.current.y - 20);
      }
    }

  }, [gameState, currentLevel]);

  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') isThrusting.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isThrusting.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  return (
    <div className="relative w-full max-w-4xl aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-2xl ring-4 ring-slate-800">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block cursor-pointer touch-none"
        onPointerDown={() => { if (gameState === 'playing') isThrusting.current = true; }}
        onPointerUp={() => isThrusting.current = false}
        onPointerLeave={() => isThrusting.current = false}
      />

      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 w-full p-6 flex flex-col gap-4 pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-white font-mono text-xl font-bold">{score}</span>
              </div>
              <div className="bg-slate-800/50 backdrop-blur px-3 py-1 rounded-lg border border-slate-700/50 flex items-center gap-2">
                <span className={`font-mono text-sm font-bold ${LEVELS[currentLevel].color}`}>
                  {LEVELS[currentLevel].name.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md mx-auto bg-slate-800/80 backdrop-blur rounded-full h-4 border border-slate-700 overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-100" style={{ width: `${progress}%` }} />
            <Flag className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 mb-8 tracking-tight">
            SKY DASH
          </h1>
          
          <div className="flex gap-4 mb-8">
            <button onClick={() => startGame(currentLevel)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 cursor-pointer">
              <Play className="w-6 h-6 inline mr-2" /> SOLO PLAY
            </button>
            <button onClick={() => setGameState('ship_select')} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 cursor-pointer flex items-center gap-2">
              <Plane className="w-5 h-5" /> HANGAR
            </button>
            <button onClick={() => setGameState('history')} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 cursor-pointer flex items-center gap-2">
              <History className="w-5 h-5" /> HISTORY
            </button>
          </div>

          <div className="flex gap-2 mb-8">
            {(Object.keys(LEVELS) as Difficulty[]).map(level => (
              <button
                key={level}
                onClick={() => { playSound('select'); setCurrentLevel(level); }}
                className={`px-4 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${currentLevel === level ? 'bg-slate-700 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
              >
                {LEVELS[level].name}
              </button>
            ))}
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
            <h3 className="text-white font-bold flex items-center gap-2"><Users className="w-5 h-5" /> MULTIPLAYER</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Room Code" 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button 
                onClick={joinRoom}
                disabled={!roomId}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'ship_select' && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center p-8 overflow-y-auto">
          <div className="w-full max-w-2xl flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-white flex items-center gap-3">
              <Plane className="w-8 h-8 text-emerald-400" />
              HANGAR
            </h2>
            <button onClick={() => setGameState('start')} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
            {(Object.keys(SHIPS) as ShipType[]).map(shipId => {
              const ship = SHIPS[shipId];
              const isSelected = currentShip === shipId;
              return (
                <div 
                  key={shipId}
                  onClick={() => selectShip(shipId)}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-slate-800 border-emerald-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 text-emerald-400">
                      <Star className="w-5 h-5 fill-current" />
                    </div>
                  )}
                  <div className="h-24 flex items-center justify-center mb-4">
                    {/* Render a static preview of the ship */}
                    <div style={{ width: ship.width, height: ship.height, position: 'relative' }}>
                      <svg width={ship.width} height={ship.height} viewBox={`-${ship.width/2} -${ship.height/2} ${ship.width} ${ship.height}`} style={{ overflow: 'visible' }}>
                        {shipId === 'classic' && (
                          <polygon points={`${ship.width/2},0 -${ship.width/2},${ship.height/2} -${ship.width/4},0 -${ship.width/2},-${ship.height/2}`} fill={ship.baseColor} />
                        )}
                        {shipId === 'stealth' && (
                          <g>
                            <polygon points={`${ship.width/2},0 -${ship.width/2},${ship.height/2} -${ship.width/3},0 -${ship.width/2},-${ship.height/2}`} fill={ship.baseColor} />
                            <ellipse cx={ship.width/6} cy="0" rx={ship.width/6} ry={ship.height/6} fill="rgba(255,255,255,0.5)" />
                          </g>
                        )}
                        {shipId === 'saucer' && (
                          <g>
                            <path d={`M -${ship.width/3} 0 A ${ship.width/3} ${ship.width/3} 0 0 1 ${ship.width/3} 0`} fill="rgba(134, 239, 172, 0.8)" />
                            <ellipse cx="0" cy="0" rx={ship.width/2} ry={ship.height/4} fill={ship.baseColor} />
                            <circle cx={`-${ship.width/3}`} cy="0" r="2" fill="#fff" />
                            <circle cx="0" cy={ship.height/6} r="2" fill="#fff" />
                            <circle cx={ship.width/3} cy="0" r="2" fill="#fff" />
                          </g>
                        )}
                        {shipId === 'blocky' && (
                          <g>
                            <rect x={`-${ship.width/2}`} y={`-${ship.height/2}`} width={ship.width} height={ship.height} fill={ship.baseColor} />
                            <rect x={ship.width/4} y={`-${ship.height/4}`} width={ship.width/4} height={ship.height/4} fill="#000" />
                          </g>
                        )}
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-center text-lg">{ship.name}</h3>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'history' && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center p-8 overflow-y-auto">
          <div className="w-full max-w-2xl flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-white flex items-center gap-3">
              <History className="w-8 h-8 text-emerald-400" />
              FLIGHT LOG
            </h2>
            <button onClick={() => setGameState('start')} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="w-full max-w-2xl bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No flight records found.</div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900/50 sticky top-0">
                    <tr>
                      <th className="p-4 text-slate-400 font-medium text-sm">Date</th>
                      <th className="p-4 text-slate-400 font-medium text-sm">Level</th>
                      <th className="p-4 text-slate-400 font-medium text-sm">Result</th>
                      <th className="p-4 text-slate-400 font-medium text-sm text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record, i) => (
                      <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="p-4 text-slate-300 text-sm">{record.date}</td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{record.level}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${record.result === 'Victory' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {record.result}
                          </span>
                        </td>
                        <td className="p-4 text-white font-mono font-bold text-right">{record.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'multiplayer_lobby' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">ROOM: {roomId}</h2>
          <p className="text-slate-400 mb-8">Waiting for players to be ready...</p>
          
          <div className="flex gap-4 mb-8">
            {(Object.keys(LEVELS) as Difficulty[]).map(level => (
              <button
                key={level}
                onClick={() => changeLevel(level)}
                className={`px-4 py-2 rounded-lg font-bold border ${currentLevel === level ? 'bg-slate-700 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                {LEVELS[level].name}
              </button>
            ))}
          </div>

          <div className="w-full max-w-md bg-slate-800 rounded-xl border border-slate-700 p-4 mb-8">
            {roomPlayers.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border-b border-slate-700 last:border-0">
                <span className="text-white font-mono">{p.id === socket?.id ? 'You' : 'Player'}</span>
                <span className={`font-bold ${p.ready ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {p.ready ? 'READY' : 'NOT READY'}
                </span>
              </div>
            ))}
          </div>

          <button 
            onClick={toggleReady}
            className={`px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 cursor-pointer ${isReady ? 'bg-slate-600 text-white' : 'bg-emerald-500 text-slate-900'}`}
          >
            {isReady ? 'CANCEL READY' : 'READY UP'}
          </button>
          
          <button onClick={() => { socket?.emit('leaveRoom', roomId); setGameState('start'); }} className="mt-6 text-slate-400 hover:text-white">
            Leave Room
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-5xl font-black text-red-500 mb-4 tracking-tight">CRASHED!</h2>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 flex flex-col items-center min-w-[240px]">
            <span className="text-slate-400 font-mono mb-1">SCORE</span>
            <span className="text-4xl font-bold text-white mb-4">{score}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setGameState('start'); }}
            className="flex items-center gap-3 bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 cursor-pointer pointer-events-auto"
          >
            <RotateCcw className="w-6 h-6" />
            <span>MENU</span>
          </button>
        </div>
      )}
      
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 mb-8 tracking-tight">VICTORY!</h2>
          <div className="bg-slate-800 p-6 rounded-2xl border border-yellow-500/50 mb-8 flex flex-col items-center min-w-[240px]">
            <span className="text-slate-400 font-mono mb-1">FINAL SCORE</span>
            <span className="text-5xl font-bold text-white mb-4">{score}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setGameState('start'); }}
            className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 cursor-pointer pointer-events-auto"
          >
            <RotateCcw className="w-6 h-6" />
            <span>MENU</span>
          </button>
        </div>
      )}
    </div>
  );
}
