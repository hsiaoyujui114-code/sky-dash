import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Shield, Zap, Star, Crosshair, Play, RotateCcw, History, X, Flag, ChevronRight, Plane, Rocket, Orbit, Users } from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const THRUST = -1.2;
const MAX_FALL_SPEED = 10;
const MAX_RISE_SPEED = -8;

type GameState = 'start' | 'playing' | 'gameover' | 'victory' | 'history' | 'level_select' | 'ship_select' | 'multiplayer_lobby' | 'multiplayer_playing' | 'multiplayer_gameover';
type ItemType = 'coin' | 'shield' | 'boost' | 'double_score' | 'weapon' | 'star' | 'slow' | 'missile' | 'portal' | 'trophy';
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'dungeon';
type ShipType = 'classic' | 'stealth' | 'saucer' | 'blocky';

interface LevelConfig {
  id: Difficulty;
  name: string;
  baseSpeed: number;
  obstacleFrequency: number;
  color: string;
}

const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { id: 'easy', name: 'Easy', baseSpeed: 4, obstacleFrequency: 60, color: 'text-green-400' },
  medium: { id: 'medium', name: 'Medium', baseSpeed: 6, obstacleFrequency: 45, color: 'text-yellow-400' },
  hard: { id: 'hard', name: 'Hard', baseSpeed: 8, obstacleFrequency: 30, color: 'text-orange-400' },
  expert: { id: 'expert', name: 'Expert', baseSpeed: 10, obstacleFrequency: 20, color: 'text-red-500' },
  dungeon: { id: 'dungeon', name: 'CSIE Dungeon', baseSpeed: 7, obstacleFrequency: 25, color: 'text-purple-500' },
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
  type?: 'bullet' | 'missile';
}

interface ScoreRecord {
  score: number;
  level: string;
  rank: string;
  date: string;
}

// Simple Web Audio API sound generator
const playSound = (type: 'coin' | 'powerup' | 'shoot' | 'explosion' | 'crash' | 'victory' | 'select') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
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

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Difficulty>('easy');
  const [currentShip, setCurrentShip] = useState<ShipType>('classic');
  const [progress, setProgress] = useState(0); // 0 to 100
  
  // Multiplayer state
  const [peer, setPeer] = useState<Peer | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const isHostRef = useRef(false);
  const hostConnectionRef = useRef<DataConnection | null>(null);
  const myPlayerIdRef = useRef<string>('');
  
  const [roomId, setRoomId] = useState('');
  const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
  const roomIdRef = useRef('');
  const isMultiplayerRef = useRef(false);
  const [playerName, setPlayerName] = useState('');
  const [roomState, setRoomState] = useState<any>(null);
  const roomStateRef = useRef<any>(null);
  const [multiplayerGoal, setMultiplayerGoal] = useState(5000);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [multiplayerWinner, setMultiplayerWinner] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [isLobbyLoading, setIsLobbyLoading] = useState(false);
  const otherPlayersRef = useRef<Record<string, any>>({});
  
  // Powerup timers (in frames, 60fps)
  const [powerups, setPowerups] = useState({
    shield: 0,
    boost: 0,
    doubleScore: 0,
    weapon: 0,
    star: 0,
    slow: 0
  });
  
  const requestRef = useRef<number>();
  const isThrusting = useRef(false);
  
  const playerRef = useRef<Player>({
    x: 100,
    y: CANVAS_HEIGHT / 2,
    width: SHIPS['classic'].width,
    height: SHIPS['classic'].height,
    vy: 0,
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const frameCountRef = useRef(0);
  const scoreRef = useRef(0);
  const trophiesRef = useRef(0);
  const speedRef = useRef(LEVELS['easy'].baseSpeed);
  const obstacleIdCounter = useRef(0);
  const itemIdCounter = useRef(0);
  const bulletIdCounter = useRef(0);
  
  const powerupsRef = useRef({
    shield: 0,
    boost: 0,
    doubleScore: 0,
    weapon: 0,
    star: 0,
    slow: 0
  });

  const currentSeedRef = useRef<number>(Math.random());
  const rngRef = useRef<SeededRandom>(new SeededRandom(currentSeedRef.current));
  const isPlayingRef = useRef(false);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const yHistoryRef = useRef<number[]>([]);
  const teleportAnimRef = useRef({ active: false, timer: 0, x: 0, y: 0, targetY: 0 });

  const startGameRef = useRef<any>(null);

  // Load history and ship on mount
  useEffect(() => {
    // This is handled by user interaction now
  }, []);

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
    }
  }, []);

  const selectShip = (shipId: ShipType) => {
    playSound('select');
    setCurrentShip(shipId);
    localStorage.setItem('skyDashShip', shipId);
    playerRef.current.width = SHIPS[shipId].width;
    playerRef.current.height = SHIPS[shipId].height;
  };

  const getRank = (currentScore: number) => {
    const ranks = [
      { name: 'Bronze', threshold: 0, color: 'text-orange-700', from: 'from-orange-800', to: 'to-orange-600' },
      { name: 'Silver', threshold: 1000, color: 'text-slate-400', from: 'from-slate-500', to: 'to-slate-300' },
      { name: 'Gold', threshold: 3000, color: 'text-yellow-400', from: 'from-yellow-600', to: 'to-yellow-400' },
      { name: 'Platinum', threshold: 6000, color: 'text-cyan-400', from: 'from-cyan-600', to: 'to-cyan-400' },
      { name: 'Diamond', threshold: 10000, color: 'text-blue-400', from: 'from-blue-600', to: 'to-blue-400' },
      { name: 'Master', threshold: 15000, color: 'text-purple-500', from: 'from-purple-700', to: 'to-purple-500' },
      { name: 'Grandmaster', threshold: 25000, color: 'text-red-500', from: 'from-red-700', to: 'to-red-500' },
    ];
    let currentRank = ranks[0];
    let nextRank = ranks[1];
    for (let i = 0; i < ranks.length; i++) {
      if (currentScore >= ranks[i].threshold) {
        currentRank = ranks[i];
        nextRank = ranks[i + 1] || ranks[i];
      }
    }
    let progress = 100;
    if (nextRank !== currentRank) {
      progress = ((currentScore - currentRank.threshold) / (nextRank.threshold - currentRank.threshold)) * 100;
    }
    return { currentRank, nextRank, progress };
  };

  const broadcastState = (state: any) => {
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'room_state', state });
    });
  };

  const hostHandleData = (senderId: string, data: any) => {
    if (data.type === 'join') {
      const newState = { ...roomStateRef.current };
      newState.players[senderId] = {
        id: senderId,
        name: data.name,
        color: data.color,
        progress: 0,
        y: 300,
        trophies: 0,
        isFinished: false
      };
      setRoomState(newState);
      roomStateRef.current = newState;
      otherPlayersRef.current = newState.players;
      broadcastState(newState);
    } else if (data.type === 'update_state') {
      if (!roomStateRef.current) return;
      const newState = { ...roomStateRef.current };
      const p = newState.players[senderId];
      if (p) {
        p.progress = data.progress;
        p.y = data.y;
        p.trophies = data.trophies;
        
        // win condition logic
        if (p.progress >= newState.goal && !p.isFinished) {
          p.isFinished = true;
          if (!newState.winner) {
            newState.status = 'finished';
            
            let highestScore = -1;
            let winnerId = senderId;
            Object.values(newState.players).forEach((player: any) => {
              const finalScore = player.progress + (player.trophies * 1000);
              if (finalScore > highestScore) {
                highestScore = finalScore;
                winnerId = player.id;
              }
            });
            newState.winner = winnerId;
            
            connectionsRef.current.forEach(conn => {
              conn.send({ type: 'game_over', winner: winnerId, players: newState.players });
            });
            
            isPlayingRef.current = false;
            setMultiplayerWinner(winnerId);
            setGameState('multiplayer_gameover');
          }
        }
        
        setRoomState(newState);
        roomStateRef.current = newState;
        otherPlayersRef.current = newState.players;
        
        connectionsRef.current.forEach(conn => {
          conn.send({ type: 'player_updated', playerData: { id: senderId, progress: data.progress, y: data.y, trophies: data.trophies } });
        });
        setLastUpdate(Date.now());
      }
    }
  };

  const clientHandleData = (data: any) => {
    if (data.type === 'room_state') {
      setRoomState(data.state);
      if (data.state.goal) {
        setMultiplayerGoal(data.state.goal);
      }
      otherPlayersRef.current = data.state.players;
    } else if (data.type === 'player_updated') {
      otherPlayersRef.current[data.playerData.id] = {
        ...otherPlayersRef.current[data.playerData.id],
        ...data.playerData
      };
      setLastUpdate(Date.now());
    } else if (data.type === 'game_started') {
      setGameState('multiplayer_playing');
      const startTime = data.startTime;
      const now = Date.now();
      if (startTime > now) {
        setCountdown(Math.ceil((startTime - now) / 1000));
        const interval = setInterval(() => {
          const currentNow = Date.now();
          if (startTime > currentNow) {
            setCountdown(Math.ceil((startTime - currentNow) / 1000));
          } else {
            setCountdown(null);
            clearInterval(interval);
            if (startGameRef.current) startGameRef.current('medium', true, true);
          }
        }, 100);
        countdownIntervalRef.current = interval;
      } else {
        setCountdown(null);
        if (startGameRef.current) startGameRef.current('medium', true, true);
      }
    } else if (data.type === 'game_over') {
      isPlayingRef.current = false;
      setMultiplayerWinner(data.winner);
      setGameState('multiplayer_gameover');
      otherPlayersRef.current = data.players;
    } else if (data.type === 'player_left') {
      const newState = { ...roomStateRef.current };
      delete newState.players[data.playerId];
      setRoomState(newState);
      roomStateRef.current = newState;
      otherPlayersRef.current = newState.players;
    }
  };

  const createRoom = () => {
    setIsLobbyLoading(true);
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      setPeer(newPeer);
      peerRef.current = newPeer;
      setRoomId(id);
      roomIdRef.current = id;
      myPlayerIdRef.current = id;
      isHostRef.current = true;
      
      const initialState = {
        id: id,
        status: 'waiting',
        goal: multiplayerGoal,
        players: {
          [id]: {
            id,
            name: playerName,
            color: SHIPS[currentShip].baseColor,
            progress: 0,
            y: 300,
            trophies: 0,
            isFinished: false
          }
        }
      };
      setRoomState(initialState);
      roomStateRef.current = initialState;
      otherPlayersRef.current = initialState.players;
      setIsLobbyLoading(false);
    });

    newPeer.on('connection', (conn) => {
      conn.on('open', () => {
        connectionsRef.current.push(conn);
      });
      conn.on('data', (data: any) => {
        hostHandleData(conn.peer, data);
      });
      conn.on('close', () => {
        connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
        const newState = { ...roomStateRef.current };
        if (newState.players[conn.peer]) {
          delete newState.players[conn.peer];
          setRoomState(newState);
          roomStateRef.current = newState;
          otherPlayersRef.current = newState.players;
          broadcastState(newState);
        }
      });
    });
  };

  const joinRoom = () => {
    setIsLobbyLoading(true);
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      setPeer(newPeer);
      peerRef.current = newPeer;
      myPlayerIdRef.current = id;
      isHostRef.current = false;
      roomIdRef.current = joinRoomIdInput;
      
      const conn = newPeer.connect(joinRoomIdInput);
      
      conn.on('open', () => {
        hostConnectionRef.current = conn;
        conn.send({ type: 'join', name: playerName, color: SHIPS[currentShip].baseColor });
        setIsLobbyLoading(false);
      });
      
      conn.on('data', (data: any) => {
        clientHandleData(data);
      });
      
      conn.on('close', () => {
         // handle host disconnect
      });
      conn.on('error', () => {
         setIsLobbyLoading(false);
         alert('Failed to connect.');
      });
    });
  };

  const startRaceMultiplayer = () => {
    if (!isHostRef.current || !roomStateRef.current) return;
    const newState = { ...roomStateRef.current };
    newState.status = 'playing';
    newState.startTime = Date.now() + 3000;
    setRoomState(newState);
    roomStateRef.current = newState;
    
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'game_started', startTime: newState.startTime });
    });
    
    // Also trigger self
    clientHandleData({ type: 'game_started', startTime: newState.startTime });
  };

  const saveScore = (newScore: number) => {
    if (newScore === 0) return;
    
    const { currentRank } = getRank(newScore);
    const newRecord: ScoreRecord = {
      score: newScore,
      level: LEVELS[currentLevel].name,
      rank: currentRank.name,
      date: new Date().toLocaleString()
    };
    
    setHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 100);
      localStorage.setItem('skyDashHistoryV2', JSON.stringify(updated));
      return updated;
    });
  };

  const startGame = (level: Difficulty, keepSeed: boolean = false, isMultiplayer: boolean = false) => {
    isMultiplayerRef.current = isMultiplayer;
    if (!keepSeed) {
      currentSeedRef.current = Math.random();
    }
    rngRef.current = new SeededRandom(currentSeedRef.current);
    
    yHistoryRef.current = [];
    teleportAnimRef.current = { active: false, timer: 0, x: 0, y: 0, targetY: 0 };
    
    setCurrentLevel(level);
    playerRef.current = {
      x: 100,
      y: CANVAS_HEIGHT / 2,
      width: SHIPS[currentShip].width,
      height: SHIPS[currentShip].height,
      vy: 0,
    };
    obstaclesRef.current = [];
    itemsRef.current = [];
    particlesRef.current = [];
    bulletsRef.current = [];
    frameCountRef.current = 0;
    scoreRef.current = 0;
    trophiesRef.current = 0;
    speedRef.current = LEVELS[level].baseSpeed;
    powerupsRef.current = { shield: 0, boost: 0, doubleScore: 0, weapon: 0, star: 0, slow: 0 };
    setScore(0);
    setProgress(0);
    setPowerups({ shield: 0, boost: 0, doubleScore: 0, weapon: 0, star: 0, slow: 0 });
    isPlayingRef.current = true;
    setGameState(isMultiplayer ? 'multiplayer_playing' : 'playing');
    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;
  };

  useEffect(() => {
    startGameRef.current = startGame;
  }, [startGame]);

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
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
    if (!isPlayingRef.current) return;

    const player = playerRef.current;
    const pUps = powerupsRef.current;
    const config = LEVELS[currentLevel];
    
    frameCountRef.current++;
    
    // Update Progress (Rank)
    if (frameCountRef.current % 10 === 0) {
      const { progress: rankProgress } = getRank(scoreRef.current);
      setProgress(rankProgress);
    }
    
    // Decrease powerup timers
    let powerupsChanged = false;
    if (pUps.shield > 0) { pUps.shield--; powerupsChanged = true; }
    if (pUps.boost > 0) { pUps.boost--; powerupsChanged = true; }
    if (pUps.doubleScore > 0) { pUps.doubleScore--; powerupsChanged = true; }
    if (pUps.star > 0) { pUps.star--; powerupsChanged = true; }
    if (pUps.slow > 0) { pUps.slow--; powerupsChanged = true; }
    if (pUps.weapon > 0) { 
      pUps.weapon--; 
      powerupsChanged = true;
      // Auto shoot every 15 frames
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

    // Base speed increases slightly over time, Boost adds temporary massive speed, Slow reduces speed
    const currentSpeed = (speedRef.current + (pUps.boost > 0 ? 10 : 0)) * (pUps.slow > 0 ? 0.5 : 1);

    if (frameCountRef.current % 300 === 0) {
      speedRef.current += 0.2; // Speed increases endlessly
    }

    if (frameCountRef.current % 10 === 0) {
      scoreRef.current += (pUps.doubleScore > 0 ? 2 : 1);
      setScore(scoreRef.current);
      yHistoryRef.current.push(player.y);
      if (yHistoryRef.current.length > 100) {
        yHistoryRef.current.shift();
      }
    }

    // Player movement
    // First 2 seconds (120 frames at 60fps) = no gravity
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
      // During grace period, if not thrusting, slowly return to center or stay put
      player.vy *= 0.9; // dampen velocity
    }

    player.vy = Math.max(MAX_RISE_SPEED, Math.min(MAX_FALL_SPEED, player.vy));
    player.y += player.vy;

    // Boundaries
    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
    } else if (player.y + player.height > CANVAS_HEIGHT) {
      player.y = CANVAS_HEIGHT - player.height;
      player.vy = 0;
      if (pUps.shield <= 0 && pUps.boost <= 0 && pUps.star <= 0 && !isGracePeriod) {
        gameOver();
        return;
      } else if (!isGracePeriod) {
        player.vy = -10;
      }
    }

    // Spawn Obstacles (start spawning after grace period)
    if (!isGracePeriod && frameCountRef.current % Math.max(15, config.obstacleFrequency - Math.floor(speedRef.current)) === 0) {
      const typeRand = rngRef.current.next();
      let type: 'top' | 'bottom' | 'floating' = 'floating';
      let width = 40 + rngRef.current.next() * 40;
      let height = 100 + rngRef.current.next() * 150;
      let y = 0;

      if (typeRand < 0.33) {
        type = 'top';
        y = 0;
      } else if (typeRand < 0.66) {
        type = 'bottom';
        y = CANVAS_HEIGHT - height;
      } else {
        type = 'floating';
        height = 40 + rngRef.current.next() * 60;
        y = rngRef.current.next() * (CANVAS_HEIGHT - height);
      }

      obstaclesRef.current.push({
        id: obstacleIdCounter.current++,
        x: CANVAS_WIDTH,
        y,
        width,
        height,
        type,
      });
    }

    // Spawn Items (start spawning after grace period)
    if (!isGracePeriod && frameCountRef.current % 120 === 0) {
      const rand = rngRef.current.next();
      let type: ItemType = 'coin';
      
      if (rand < 0.08) type = 'shield';
      else if (rand < 0.16) type = 'boost';
      else if (rand < 0.24) type = 'weapon';
      else if (rand < 0.32) type = 'star';
      else if (rand < 0.40) type = 'slow';
      else if (rand < 0.48) type = 'missile';
      else if (rand < 0.56) type = 'portal';
      else if (rand < 0.66) type = 'double_score';
      else if (rand < 0.76) type = 'trophy';

      itemsRef.current.push({
        id: itemIdCounter.current++,
        x: CANVAS_WIDTH,
        y: 50 + rngRef.current.next() * (CANVAS_HEIGHT - 100),
        radius: 15,
        type,
      });
    }

    // Update Bullets
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const bullet = bulletsRef.current[i];
      bullet.x += bullet.vx;
      
      // Check bullet collision with obstacles
      let hit = false;
      for (let j = obstaclesRef.current.length - 1; j >= 0; j--) {
        const obs = obstaclesRef.current[j];
        if (
          bullet.x < obs.x + obs.width &&
          bullet.x + bullet.width > obs.x &&
          bullet.y < obs.y + obs.height &&
          bullet.y + bullet.height > obs.y
        ) {
          spawnParticles(obs.x, bullet.y, '#ef4444', 15);
          playSound('explosion');
          obstaclesRef.current.splice(j, 1);
          
          if (bullet.type === 'missile') {
            scoreRef.current += (pUps.doubleScore > 0 ? 400 : 200);
          } else {
            scoreRef.current += (pUps.doubleScore > 0 ? 100 : 50);
          }
          
          setScore(scoreRef.current);
          hit = true;
          break;
        }
      }
      
      if (hit || bullet.x > CANVAS_WIDTH) {
        bulletsRef.current.splice(i, 1);
      }
    }

    // Update Obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= currentSpeed;

      // Player collision with obstacle
      if (
        player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y
      ) {
        if (pUps.shield > 0 || pUps.boost > 0 || pUps.star > 0) {
          // Destroy obstacle if shielded or boosting or star
          spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ef4444', 30);
          playSound('explosion');
          obstaclesRef.current.splice(i, 1);
          scoreRef.current += (pUps.doubleScore > 0 ? 100 : 50);
          setScore(scoreRef.current);
          
          // If only shielded (not boosting or star), remove shield after 1 hit
          if (pUps.shield > 0 && pUps.boost <= 0 && pUps.star <= 0) {
            pUps.shield = 0;
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#3b82f6', 30);
          }
          continue;
        } else {
          gameOver();
          return;
        }
      }

      if (obs.x + obs.width < 0) {
        obstaclesRef.current.splice(i, 1);
      }
    }

    // Update Items
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      item.x -= currentSpeed;

      const distX = Math.abs(player.x + player.width / 2 - item.x);
      const distY = Math.abs(player.y + player.height / 2 - item.y);

      if (
        distX < player.width / 2 + item.radius &&
        distY < player.height / 2 + item.radius
      ) {
        if (item.type === 'coin') {
          scoreRef.current += (pUps.doubleScore > 0 ? 200 : 100);
          spawnParticles(item.x, item.y, '#eab308', 15);
          playSound('coin');
        } else if (item.type === 'trophy') {
          trophiesRef.current += 1;
          scoreRef.current += (pUps.doubleScore > 0 ? 2000 : 1000);
          spawnParticles(item.x, item.y, '#fbbf24', 30);
          playSound('powerup');
        } else if (item.type === 'missile') {
          playSound('shoot');
          bulletsRef.current.push({
            id: bulletIdCounter.current++,
            x: player.x + player.width,
            y: player.y + player.height / 2 - 4,
            vx: 20,
            width: 30,
            height: 8,
            type: 'missile'
          });
          spawnParticles(item.x, item.y, '#ef4444', 30);
        } else if (item.type === 'portal') {
          playSound('powerup');
          let newY = player.y;
          if (Math.random() < 0.6 && yHistoryRef.current.length > 0) {
            const randomIndex = Math.floor(Math.random() * yHistoryRef.current.length);
            newY = yHistoryRef.current[randomIndex];
          } else {
            newY = Math.random() * (CANVAS_HEIGHT - player.height);
          }
          teleportAnimRef.current = { active: true, timer: 0, x: player.x + player.width/2, y: player.y + player.height/2, targetY: newY + player.height/2 };
          player.y = newY;
          player.vy = 0;
          spawnParticles(item.x, item.y, '#a855f7', 30);
        } else {
          playSound('powerup');
          if (item.type === 'shield') {
            pUps.shield = 600; // 10 seconds
            spawnParticles(item.x, item.y, '#3b82f6', 30);
          } else if (item.type === 'boost') {
            pUps.boost = 300; // 5 seconds
            spawnParticles(item.x, item.y, '#f97316', 30);
          } else if (item.type === 'double_score') {
            pUps.doubleScore = 600; // 10 seconds
            spawnParticles(item.x, item.y, '#eab308', 30);
          } else if (item.type === 'weapon') {
            pUps.weapon = 480; // 8 seconds
            spawnParticles(item.x, item.y, '#22c55e', 30);
          } else if (item.type === 'star') {
            pUps.star = 600; // 10 seconds
            spawnParticles(item.x, item.y, '#fcd34d', 30);
          } else if (item.type === 'slow') {
            pUps.slow = 300; // 5 seconds
            spawnParticles(item.x, item.y, '#c084fc', 30);
          }
          setPowerups({ ...pUps });
        }
        
        setScore(scoreRef.current);
        itemsRef.current.splice(i, 1);
        continue;
      }

      if (item.x + item.radius < 0) {
        itemsRef.current.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
      }
    }

    if (teleportAnimRef.current.active) {
      teleportAnimRef.current.timer++;
      if (teleportAnimRef.current.timer > 30) {
        teleportAnimRef.current.active = false;
      }
    }

    // Multiplayer emit
    if (isMultiplayerRef.current && frameCountRef.current % 3 === 0) {
      if (isHostRef.current) {
        // If host, handle directly
        hostHandleData(myPlayerIdRef.current, {
          type: 'update_state',
          progress: scoreRef.current,
          y: player.y,
          trophies: trophiesRef.current
        });
      } else if (hostConnectionRef.current) {
        // If guest, send to host
        hostConnectionRef.current.send({
          type: 'update_state',
          progress: scoreRef.current,
          y: player.y,
          trophies: trophiesRef.current
        });
      }
    }

    // Dungeon victory condition
    if (currentLevel === 'dungeon' && scoreRef.current >= 10000) {
      victory();
    }
  }, [currentLevel]);

  const respawn = () => {
    playSound('crash');
    spawnParticles(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, '#ef4444', 50);
    
    // Find last checkpoint (every 1000 points)
    const checkpoint = Math.floor(scoreRef.current / 1000) * 1000;
    scoreRef.current = checkpoint;
    setScore(checkpoint);
    
    // Reset player
    playerRef.current.y = CANVAS_HEIGHT / 2;
    playerRef.current.vy = 0;
    
    // Give temporary invincibility (star power) and reset other powerups
    powerupsRef.current = { shield: 0, boost: 0, doubleScore: 0, weapon: 0, star: 150, slow: 0 };
    setPowerups({ ...powerupsRef.current });
    
    // Clear obstacles on screen to prevent immediate death
    obstaclesRef.current = [];
    itemsRef.current = [];
    bulletsRef.current = [];
    yHistoryRef.current = [];
  };

  const gameOver = () => {
    if (isMultiplayerRef.current) {
      respawn();
      return;
    }
    playSound('crash');
    isPlayingRef.current = false;
    setGameState('gameover');
    saveScore(scoreRef.current);
    setHighScore(prev => Math.max(prev, scoreRef.current));
    spawnParticles(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, '#ef4444', 50);
  };

  const victory = () => {
    playSound('victory');
    isPlayingRef.current = false;
    setGameState('victory');
    saveScore(scoreRef.current);
    setHighScore(prev => Math.max(prev, scoreRef.current));
    spawnParticles(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, '#10b981', 100);
  };

  const quitMultiplayer = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (peerRef.current) {
      if (!isHostRef.current && hostConnectionRef.current) {
        hostConnectionRef.current.send({ type: 'player_left', playerId: myPlayerIdRef.current });
      }
      peerRef.current.destroy();
      peerRef.current = null;
      setPeer(null);
    }
    connectionsRef.current = [];
    hostConnectionRef.current = null;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setGameState('start');
    setRoomState(null);
    roomStateRef.current = null;
    setRoomId('');
    roomIdRef.current = '';
    myPlayerIdRef.current = '';
    isPlayingRef.current = false;
    isMultiplayerRef.current = false;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    if (currentLevel === 'dungeon') {
      ctx.fillStyle = '#1e1b4b'; // Dark purple background for dungeon
    } else {
      ctx.fillStyle = '#0f172a';
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid lines for speed illusion
    const currentSpeed = (speedRef.current + (powerupsRef.current.boost > 0 ? 10 : 0)) * (powerupsRef.current.slow > 0 ? 0.5 : 1);
    if (currentLevel === 'dungeon') {
      ctx.strokeStyle = '#312e81'; // Purple grid lines
    } else {
      ctx.strokeStyle = '#1e293b';
    }
    ctx.lineWidth = 2;
    const offset = (frameCountRef.current * currentSpeed) % 100;
    for (let i = -offset; i < CANVAS_WIDTH; i += 100) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Speed lines if boosting
    if (powerupsRef.current.boost > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const y = Math.random() * CANVAS_HEIGHT;
        const length = 50 + Math.random() * 150;
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH, y);
        ctx.lineTo(CANVAS_WIDTH - length, y);
        ctx.stroke();
      }
    }

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Bullets
    bulletsRef.current.forEach(b => {
      if (b.type === 'missile') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(b.x - 5, b.y + 1, 5, b.height - 2);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x + b.width - 5, b.y + 1, 5, b.height - 2);
        ctx.shadowBlur = 0;
      }
    });

    // Obstacles
    obstaclesRef.current.forEach(obs => {
      if (currentLevel === 'dungeon') {
        // Dungeon obstacles (e.g., stone pillars or magical barriers)
        ctx.fillStyle = '#4c1d95'; // Deep purple
        ctx.shadowColor = '#6d28d9';
        ctx.shadowBlur = 15;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#2e1065';
        ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
        
        // Add some "runes" or details
        ctx.fillStyle = '#a78bfa';
        ctx.font = '16px monospace';
        ctx.fillText('CSIE', obs.x + obs.width / 2 - 18, obs.y + obs.height / 2);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
      }
      ctx.shadowBlur = 0;
    });

    // Items
    itemsRef.current.forEach(item => {
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      
      if (item.type === 'coin') {
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#eab308';
      } else if (item.type === 'shield') {
        ctx.fillStyle = '#3b82f6';
        ctx.shadowColor = '#3b82f6';
      } else if (item.type === 'boost') {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
      } else if (item.type === 'double_score') {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
      } else if (item.type === 'weapon') {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
      } else if (item.type === 'star') {
        const hue = (frameCountRef.current * 5) % 360;
        const starColor = `hsl(${hue}, 100%, 50%)`;
        ctx.fillStyle = starColor;
        ctx.shadowColor = starColor;
      } else if (item.type === 'slow') {
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
      } else if (item.type === 'missile') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
      } else if (item.type === 'portal') {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
      } else if (item.type === 'trophy') {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
      }
      
      ctx.shadowBlur = 15;
      ctx.fill();
      
      // Inner glow/icon representation
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();
      
      // Draw symbol
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px Arial';
      ctx.shadowBlur = 0;
      if (item.type === 'shield') ctx.fillText('S', item.x, item.y);
      if (item.type === 'boost') ctx.fillText('B', item.x, item.y);
      if (item.type === 'double_score') ctx.fillText('2x', item.x, item.y);
      if (item.type === 'weapon') ctx.fillText('W', item.x, item.y);
      if (item.type === 'star') ctx.fillText('★', item.x, item.y);
      if (item.type === 'slow') ctx.fillText('⏱', item.x, item.y);
      if (item.type === 'missile') ctx.fillText('M', item.x, item.y);
      if (item.type === 'portal') ctx.fillText('O', item.x, item.y);
      if (item.type === 'trophy') ctx.fillText('🏆', item.x, item.y);
    });

    // Finish Line (Multiplayer & Dungeon)
    const isMultiplayer = gameState === 'multiplayer_playing' || gameState === 'multiplayer_gameover';
    const isDungeon = currentLevel === 'dungeon' && (gameState === 'playing' || gameState === 'victory' || gameState === 'gameover');
    
    if (isMultiplayer || isDungeon) {
      const goal = isMultiplayer ? multiplayerGoal : 10000;
      const smoothScore = scoreRef.current + (frameCountRef.current % 10) / 10 * (powerupsRef.current.doubleScore > 0 ? 2 : 1);
      const finishLineX = playerRef.current.x + (goal - smoothScore) * (speedRef.current * 10);
      
      if (finishLineX > -100 && finishLineX < CANVAS_WIDTH + 100) {
        ctx.save();
        const squareSize = 20;
        for (let y = 0; y < CANVAS_HEIGHT; y += squareSize) {
          ctx.fillStyle = (Math.floor(y / squareSize) % 2 === 0) ? '#fff' : '#000';
          ctx.fillRect(finishLineX, y, squareSize, squareSize);
          ctx.fillStyle = (Math.floor(y / squareSize) % 2 === 0) ? '#000' : '#fff';
          ctx.fillRect(finishLineX + squareSize, y, squareSize, squareSize);
        }
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('FINISH', finishLineX + squareSize, 40);
        ctx.restore();
      }
    }

    // Other Players (Multiplayer)
    if (isMultiplayerRef.current && roomStateRef.current) {
      Object.values(otherPlayersRef.current).forEach((p: any) => {
        if (p.id === myPlayerIdRef.current) return;
        
        // Calculate relative X position based on progress difference
        const progressDiff = p.progress - scoreRef.current;
        // Scale difference so it fits on screen (e.g., 1 progress = 1 pixel)
        const relativeX = playerRef.current.x + progressDiff;
        
        if (relativeX > -50 && relativeX < CANVAS_WIDTH + 50) {
          ctx.save();
          ctx.translate(relativeX + playerRef.current.width / 2, p.y + playerRef.current.height / 2);
          ctx.globalAlpha = 0.5; // Ghost effect
          
          // Draw a simple ship for other players
          ctx.fillStyle = p.color || '#4285F4';
          ctx.beginPath();
          ctx.moveTo(playerRef.current.width / 2, 0);
          ctx.lineTo(-playerRef.current.width / 2, playerRef.current.height / 2);
          ctx.lineTo(-playerRef.current.width / 4, 0);
          ctx.lineTo(-playerRef.current.width / 2, -playerRef.current.height / 2);
          ctx.closePath();
          ctx.fill();
          
          // Name tag
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, 0, -playerRef.current.height);
          
          ctx.restore();
        }
      });
    }

    // Player
    const player = playerRef.current;
    const pUps = powerupsRef.current;
    const shipConfig = SHIPS[currentShip];
    
    if (gameState !== 'gameover' || particlesRef.current.length > 0) {
      ctx.save();
      ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
      
      ctx.rotate(Math.min(Math.max(player.vy * 0.05, -0.5), 0.5));
      
      // Player body color based on powerups
      let shipColor = shipConfig.baseColor;
      if (pUps.star > 0) {
        const hue = (frameCountRef.current * 10) % 360;
        shipColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowColor = shipColor;
        ctx.shadowBlur = 20;
      } else if (pUps.boost > 0) {
        shipColor = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 20;
      } else if (pUps.doubleScore > 0) {
        shipColor = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
      } else if (pUps.weapon > 0) {
        shipColor = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowColor = shipColor;
        ctx.shadowBlur = 10;
      }

      // Draw Ship using its specific draw function
      shipConfig.draw(ctx, player.width, player.height, shipColor, isThrusting.current, pUps.boost > 0);

      ctx.restore();

      // Draw Shield
      if (pUps.shield > 0) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, Math.max(player.width, player.height), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 + Math.sin(frameCountRef.current * 0.1) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
      }
      
      // Draw Grace Period Indicator
      if (gameState === 'playing' && frameCountRef.current < 120) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('GET READY!', player.x + player.width / 2, player.y - 20);
      }
    }

    // Draw teleport animation
    if (teleportAnimRef.current.active) {
      const { timer, x, y, targetY } = teleportAnimRef.current;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      if (timer < 15) {
        const radius = 50 * (1 - timer / 15);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${1 - timer/15})`;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#d8b4fe';
        ctx.stroke();
      }
      
      if (timer > 5) {
        const expandTimer = timer - 5;
        const radius = 50 * Math.sin((expandTimer / 25) * Math.PI);
        if (radius > 0) {
          ctx.beginPath();
          ctx.arc(x, targetY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(168, 85, 247, ${1 - Math.abs(expandTimer - 12.5)/12.5})`;
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#d8b4fe';
          ctx.stroke();
        }
      }
      ctx.restore();
    }

  }, [gameState, currentLevel, currentShip]);

  const loop = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
    }
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Cap deltaTime to avoid spiral of death if tab is inactive
    accumulatorRef.current += Math.min(deltaTime, 100);

    const TIME_STEP = 1000 / 60; // 60 FPS fixed time step

    while (accumulatorRef.current >= TIME_STEP) {
      update();
      accumulatorRef.current -= TIME_STEP;
    }

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
        if (gameState === 'start') {
          setGameState('level_select');
        } else if (gameState === 'gameover' || gameState === 'victory') {
          startGame(currentLevel, true);
        } else if (gameState === 'playing' || gameState === 'multiplayer_playing') {
          isThrusting.current = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isThrusting.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handlePointerDown = () => {
    if (gameState === 'start') {
      setGameState('level_select');
    } else if (gameState === 'gameover' || gameState === 'victory') {
      startGame(currentLevel, true);
    } else if (gameState === 'playing' || gameState === 'multiplayer_playing') {
      isThrusting.current = true;
    }
  };

  const handlePointerUp = () => {
    isThrusting.current = false;
  };

  // Helper to render ship preview in UI
  const renderShipPreview = (shipId: ShipType, isSelected: boolean) => {
    const ship = SHIPS[shipId];
    return (
      <button
        key={ship.id}
        onClick={(e) => { e.stopPropagation(); selectShip(ship.id); }}
        className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
          isSelected 
            ? 'bg-slate-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
            : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
        }`}
      >
        <div className="w-16 h-16 flex items-center justify-center relative">
          {/* Simple CSS representation of ships for the UI */}
          {ship.id === 'classic' && (
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[30px] border-l-emerald-500 border-b-[15px] border-b-transparent" />
          )}
          {ship.id === 'stealth' && (
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[35px] border-l-indigo-500 border-b-[10px] border-b-transparent relative">
              <div className="absolute -left-[25px] -top-[3px] w-2 h-2 bg-white/50 rounded-full" />
            </div>
          )}
          {ship.id === 'saucer' && (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute top-1 w-6 h-4 bg-green-300/80 rounded-t-full" />
              <div className="absolute w-10 h-4 bg-pink-500 rounded-full" />
              <div className="absolute flex gap-1 z-10">
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>
          )}
          {ship.id === 'blocky' && (
            <div className="w-8 h-8 bg-yellow-500 relative">
              <div className="absolute right-1 top-1 w-2 h-2 bg-black" />
            </div>
          )}
        </div>
        <span className={`font-bold text-sm ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
          {ship.name}
        </span>
        {isSelected && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-900 rounded-full p-1">
            <Star className="w-3 h-3 fill-current" />
          </div>
        )}
      </button>
    );
  };

  const { currentRank, nextRank } = getRank(score);

  return (
    <div className="relative w-full max-w-4xl aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-2xl ring-4 ring-slate-800">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Top HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 w-full p-6 flex flex-col gap-4 pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3">
                <Trophy className={`w-5 h-5 ${currentRank.color}`} />
                <span className="text-white font-mono text-xl font-bold">{score}</span>
              </div>
              <div className="flex gap-2">
                <div className="bg-slate-800/50 backdrop-blur px-3 py-1 rounded-lg border border-slate-700/50 flex items-center gap-2">
                  <span className={`font-mono text-sm font-bold ${LEVELS[currentLevel].color}`}>
                    {LEVELS[currentLevel].name.toUpperCase()}
                  </span>
                </div>
                <div className="bg-slate-800/50 backdrop-blur px-3 py-1 rounded-lg border border-slate-700/50 flex items-center gap-2">
                  <span className={`font-mono text-sm font-bold ${currentRank.color}`}>
                    {currentRank.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {powerups.shield > 0 && (
                <div className="bg-blue-500/20 px-3 py-2 rounded-lg border border-blue-500/50 flex items-center gap-2 animate-pulse">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-300 font-mono text-sm">{Math.ceil(powerups.shield / 60)}s</span>
                </div>
              )}
              {powerups.boost > 0 && (
                <div className="bg-orange-500/20 px-3 py-2 rounded-lg border border-orange-500/50 flex items-center gap-2 animate-pulse">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-300 font-mono text-sm">{Math.ceil(powerups.boost / 60)}s</span>
                </div>
              )}
              {powerups.doubleScore > 0 && (
                <div className="bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-500/50 flex items-center gap-2 animate-pulse">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-300 font-mono text-sm">{Math.ceil(powerups.doubleScore / 60)}s</span>
                </div>
              )}
              {powerups.weapon > 0 && (
                <div className="bg-green-500/20 px-3 py-2 rounded-lg border border-green-500/50 flex items-center gap-2 animate-pulse">
                  <Crosshair className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-mono text-sm">{Math.ceil(powerups.weapon / 60)}s</span>
                </div>
              )}
              {powerups.star > 0 && (
                <div className="bg-yellow-300/20 px-3 py-2 rounded-lg border border-yellow-300/50 flex items-center gap-2 animate-pulse">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="text-yellow-200 font-mono text-sm">{Math.ceil(powerups.star / 60)}s</span>
                </div>
              )}
              {powerups.slow > 0 && (
                <div className="bg-purple-500/20 px-3 py-2 rounded-lg border border-purple-500/50 flex items-center gap-2 animate-pulse">
                  <History className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-300 font-mono text-sm">{Math.ceil(powerups.slow / 60)}s</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar (Rank) */}
          <div className="w-full max-w-md mx-auto flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono font-bold">
              <span className={currentRank.color}>{currentRank.name}</span>
              {currentRank.name !== nextRank.name && (
                <span className={nextRank.color}>{nextRank.name}</span>
              )}
            </div>
            <div className="w-full bg-slate-800/80 backdrop-blur rounded-full h-3 border border-slate-700 overflow-hidden relative">
              <div 
                className={`h-full bg-gradient-to-r ${currentRank.from} ${currentRank.to} transition-all duration-100`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 mb-8 tracking-tight">
            SKY DASH
          </h1>
          
          <div className="absolute top-6 right-6 flex gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); setGameState('multiplayer_lobby'); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg border border-indigo-400 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-5 h-5" />
              <span className="font-bold">Multiplayer</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setGameState('ship_select'); }}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plane className="w-5 h-5" />
              <span className="font-bold">Hangar</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setGameState('history'); }}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <History className="w-5 h-5" />
              <span className="font-bold">History</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-12 pointer-events-none">
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-bold">Shield (8%)</div>
                <div className="text-slate-400 text-sm">Invincible for 10s</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div className="text-white font-bold">Boost (8%)</div>
                <div className="text-slate-400 text-sm">Extreme speed for 5s</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-white font-bold">Double Score (10%)</div>
                <div className="text-slate-400 text-sm">2x Points for 10s</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-white font-bold">Weapon (8%)</div>
                <div className="text-slate-400 text-sm">Auto-shoot for 8s</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-bold">Star (8%)</div>
                <div className="text-slate-400 text-sm">Invincible & destroys all for 10s</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                <History className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-white font-bold">Slow (8%)</div>
                <div className="text-slate-400 text-sm">Slows time for 5s</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-white font-bold">Missile (8%)</div>
                <div className="text-slate-400 text-sm">Fires a missile, +200 pts on hit</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                <Orbit className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-bold">Portal (8%)</div>
                <div className="text-slate-400 text-sm">Teleports you anywhere</div>
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setGameState('level_select'); }}
            className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START GAME</span>
          </button>
        </div>
      )}

      {/* Ship Select Screen (Hangar) */}
      {gameState === 'ship_select' && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-3xl bg-slate-800 rounded-2xl border border-slate-700 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Plane className="w-6 h-6 text-emerald-400" />
                Hangar - Select Ship
              </h2>
              <button 
                onClick={(e) => { e.stopPropagation(); setGameState('start'); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              {(Object.keys(SHIPS) as ShipType[]).map((shipId) => 
                renderShipPreview(shipId, currentShip === shipId)
              )}
            </div>
            
            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-between items-center rounded-b-2xl">
              <div className="text-slate-400">
                Selected: <span className="text-white font-bold">{SHIPS[currentShip].name}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setGameState('start'); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Select Screen */}
      {gameState === 'level_select' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <h2 className="text-4xl font-black text-white mb-8 tracking-tight">SELECT LEVEL</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {(Object.keys(LEVELS) as Difficulty[]).map((levelKey) => {
              const level = LEVELS[levelKey];
              return (
                <button
                  key={level.id}
                  onClick={(e) => { e.stopPropagation(); startGame(level.id); }}
                  className="bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl border border-slate-700 flex flex-col items-start gap-2 transition-all hover:scale-105 cursor-pointer group"
                >
                  <div className={`text-2xl font-bold ${level.color} flex items-center justify-between w-full`}>
                    {level.name}
                    <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-slate-400 text-sm text-left">
                    Speed: {level.baseSpeed}x <br/>
                    Endless Mode
                  </div>
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setGameState('start'); }}
            className="mt-8 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* History Screen */}
      {gameState === 'history' && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 flex flex-col h-[80%]">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <History className="w-6 h-6 text-emerald-400" />
                Score History
              </h2>
              <button 
                onClick={(e) => { e.stopPropagation(); setGameState('start'); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 font-mono">
                  No records yet. Play a game!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((record, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-mono w-8">#{index + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-slate-300 text-sm">{record.date}</span>
                          <div className="flex gap-2 text-xs font-mono mt-1">
                            <span className="text-slate-400">[{record.level}]</span>
                            <span className="text-emerald-400">
                              {record.rank}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-yellow-500 font-mono">
                        {record.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-5xl font-black text-emerald-400 mb-4 tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">DUNGEON CLEARED!</h2>
          <div className="flex flex-col items-center mb-6">
            <Trophy className={`w-16 h-16 mb-2 text-yellow-400 drop-shadow-lg`} />
            <p className={`text-2xl font-bold font-mono text-yellow-400`}>Legendary</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 flex flex-col items-center min-w-[240px]">
            <span className="text-slate-400 font-mono mb-1">SCORE</span>
            <span className="text-4xl font-bold text-white mb-4">{score}</span>
            <div className="w-full h-px bg-slate-700 mb-4" />
            <span className="text-slate-500 font-mono text-sm mb-1">BEST</span>
            <span className="text-2xl font-bold text-yellow-500">{highScore}</span>
          </div>
          <div className="flex gap-4 pointer-events-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); setGameState('level_select'); }}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>MENU</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(currentLevel, true); }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-5xl font-black text-red-500 mb-4 tracking-tight">CRASHED!</h2>
          <div className="flex flex-col items-center mb-6">
            <Trophy className={`w-16 h-16 mb-2 ${currentRank.color} drop-shadow-lg`} />
            <p className={`text-2xl font-bold font-mono ${currentRank.color}`}>Rank: {currentRank.name}</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 flex flex-col items-center min-w-[240px]">
            <span className="text-slate-400 font-mono mb-1">SCORE</span>
            <span className="text-4xl font-bold text-white mb-4">{score}</span>
            <div className="w-full h-px bg-slate-700 mb-4" />
            <span className="text-slate-500 font-mono text-sm mb-1">BEST</span>
            <span className="text-2xl font-bold text-yellow-500">{highScore}</span>
          </div>
          <div className="flex gap-4 pointer-events-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); setGameState('level_select'); }}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>MENU</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(currentLevel, true); }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>RETRY LEVEL</span>
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Lobby */}
      {gameState === 'multiplayer_lobby' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 overflow-hidden flex flex-col pointer-events-auto">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-black text-white tracking-tight">MULTIPLAYER</h2>
              </div>
              <button 
                onClick={quitMultiplayer}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer flex-shrink-0 z-50 pointer-events-auto"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {!roomState ? (
                <>
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">Player Name</label>
                    <input 
                      type="text" 
                      value={playerName} 
                      onChange={(e) => setPlayerName(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Enter your name"
                      disabled={isLobbyLoading}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (playerName) createRoom();
                      }}
                      disabled={!playerName || isLobbyLoading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      {isLobbyLoading ? 'WAITING...' : 'CREATE NEW'}
                    </button>
                    
                    <div className="flex-1 flex gap-2">
                      <input 
                        type="text" 
                        value={joinRoomIdInput} 
                        onChange={(e) => setJoinRoomIdInput(e.target.value)} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        placeholder="Room ID"
                        disabled={isLobbyLoading}
                      />
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (joinRoomIdInput && playerName) joinRoom();
                        }}
                        disabled={!joinRoomIdInput || !playerName || isLobbyLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-bold transition-all cursor-pointer"
                      >
                        JOIN
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-slate-400 text-sm font-bold mb-3 flex justify-between">
                      <span>Room ID: <span className="text-white select-all">{roomId}</span></span>
                      {isHostRef.current && <span className="text-indigo-400">HOST</span>}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {Object.values(roomState.players).map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}></div>
                          <span className="text-white font-bold">{p.name} {p.id === myPlayerIdRef.current ? '(You)' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-slate-400 text-sm font-bold mb-3">Race Distance</h3>
                    <select 
                      value={multiplayerGoal}
                      onChange={(e) => {
                        const newGoal = parseInt(e.target.value);
                        setMultiplayerGoal(newGoal);
                        const newState = { ...roomStateRef.current, goal: newGoal };
                        setRoomState(newState);
                        roomStateRef.current = newState;
                        broadcastState(newState);
                      }}
                      disabled={!isHostRef.current}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value={1000}>Sprint (1,000)</option>
                      <option value={3000}>Short (3,000)</option>
                      <option value={5000}>Standard (5,000)</option>
                      <option value={10000}>Marathon (10,000)</option>
                      <option value={20000}>Endurance (20,000)</option>
                    </select>
                  </div>
                  {isHostRef.current ? (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        startRaceMultiplayer();
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-4 rounded-xl font-black transition-all cursor-pointer mt-2"
                    >
                      START RACE
                    </button>
                  ) : (
                    <div className="text-center p-4 text-slate-400 font-bold bg-slate-800 rounded-lg border border-slate-700 animate-pulse">
                      WAITING FOR HOST TO START...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Countdown */}
      {gameState === 'multiplayer_playing' && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </span>
        </div>
      )}

      {/* Multiplayer HUD */}
      {gameState === 'multiplayer_playing' && (
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
          {/* Top Left: Quit Button & Score */}
          <div className="flex flex-col gap-2">
            <button 
              onClick={quitMultiplayer}
              className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-4 py-2 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-slate-700/80 rounded-lg pointer-events-auto transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span className="font-bold text-sm">QUIT</span>
            </button>
            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3">
              <Trophy className={`w-5 h-5 ${currentRank.color}`} />
              <span className="text-white font-mono text-xl font-bold">{score}</span>
            </div>
          </div>

          {/* Top Right: Standings */}
          <div className="flex flex-col gap-2 items-end">
            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex flex-col gap-1 min-w-[200px]">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Race Progress</span>
              {Object.values(otherPlayersRef.current).map((p: any) => (
                <div key={p.id} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white font-bold truncate max-w-[100px]">{p.name}</span>
                    <span className="text-slate-300 font-mono">{Math.floor((p.progress / multiplayerGoal) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (p.progress / multiplayerGoal) * 100)}%`, backgroundColor: p.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Game Over */}
      {gameState === 'multiplayer_gameover' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-5xl font-black text-yellow-500 mb-2 tracking-tight">RACE FINISHED!</h2>
          <p className="text-xl text-white mb-8">
            {multiplayerWinner === myPlayerIdRef.current ? 'You won the race!' : `${otherPlayersRef.current[multiplayerWinner || '']?.name || 'Someone'} won the race!`}
          </p>
          
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 flex flex-col gap-4 min-w-[300px]">
            <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider border-b border-slate-700 pb-2">Final Standings</h3>
            {Object.values(otherPlayersRef.current)
              .sort((a: any, b: any) => (b.progress + b.trophies * 1000) - (a.progress + a.trophies * 1000))
              .map((p: any, index: number) => (
              <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg ${p.id === multiplayerWinner ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-slate-900/50'}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-black ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-600' : 'text-slate-500'}`}>
                    #{index + 1}
                  </span>
                  <span className="text-white font-bold">{p.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-emerald-400 font-mono font-bold">{Math.floor(p.progress)}</span>
                  <span className="text-yellow-500 text-xs font-mono flex items-center gap-1"><Trophy className="w-3 h-3"/> {p.trophies}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-4 pointer-events-auto">
            <button 
              onClick={quitMultiplayer}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105 cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>LEAVE ROOM</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
