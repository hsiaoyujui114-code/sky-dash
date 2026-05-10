export type GameState = 'name_input' | 'start' | 'playing' | 'gameover' | 'victory' | 'history' | 'level_select' | 'ship_select' | 'multiplayer_lobby' | 'multiplayer_playing' | 'multiplayer_gameover' | 'leaderboard';
export type ItemType = 'coin' | 'shield' | 'boost' | 'double_score' | 'weapon' | 'star' | 'slow' | 'missile' | 'portal' | 'trophy';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'insane' | 'dungeon';
export type ShipType = 'classic' | 'stealth' | 'saucer' | 'blocky' | 'fighter' | 'shuttle' | 'cruiser';

export interface LevelConfig {
  id: Difficulty;
  name: string;
  baseSpeed: number;
  obstacleFrequency: number;
  color: string;
}

export interface ShipConfig {
  id: ShipType;
  name: string;
  baseColor: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, color: string, isThrusting: boolean, boost: boolean) => void;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'top' | 'bottom' | 'floating';
}

export interface Item {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: ItemType;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  type?: 'bullet' | 'missile';
}

export interface ScoreRecord {
  score: number;
  level: string;
  rank: string;
  date: string;
}
