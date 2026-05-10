import { Difficulty, ShipType, LevelConfig, ShipConfig } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRAVITY = 0.5;
export const THRUST = -1.2;
export const MAX_FALL_SPEED = 10;
export const MAX_RISE_SPEED = -8;

export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { id: 'easy', name: 'Easy', baseSpeed: 4, obstacleFrequency: 60, color: 'text-green-400' },
  medium: { id: 'medium', name: 'Medium', baseSpeed: 6, obstacleFrequency: 45, color: 'text-yellow-400' },
  hard: { id: 'hard', name: 'Hard', baseSpeed: 8, obstacleFrequency: 30, color: 'text-orange-400' },
  expert: { id: 'expert', name: 'Expert', baseSpeed: 10, obstacleFrequency: 20, color: 'text-red-500' },
  insane: { id: 'insane', name: 'Insane', baseSpeed: 13, obstacleFrequency: 15, color: 'text-rose-600' },
  dungeon: { id: 'dungeon', name: 'CSIE Dungeon', baseSpeed: 7, obstacleFrequency: 25, color: 'text-purple-500' },
};

export const SHIPS: Record<ShipType, ShipConfig> = {
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
      ctx.fillStyle = 'rgba(134, 239, 172, 0.8)';
      ctx.beginPath();
      ctx.arc(0, -h/6, w/3, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w/2, h/4, 0, 0, Math.PI*2);
      ctx.fill();

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
      ctx.fillRect(w/4, -h/4, w/4, h/4);

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        const flameLength = boost ? 20 : 10;
        ctx.fillRect(-w/2 - flameLength, -h/4, flameLength, h/2);
      }
    }
  },
  fighter: {
    id: 'fighter',
    name: 'X-Fighter',
    baseColor: '#ef4444',
    width: 45,
    height: 35,
    draw: (ctx, w, h, color, thrusting, boost) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(-w / 4, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(0, -h / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(w / 8, 0, w / 6, 0, Math.PI * 2);
      ctx.fill();

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        const flameLength = boost ? 25 : 15;
        ctx.moveTo(-w / 4 + 5, -h / 4);
        ctx.lineTo(-w / 2 - Math.random() * flameLength, -h / 4);
        ctx.lineTo(-w / 2 + 5, -h / 4 + 5);
        ctx.moveTo(-w / 4 + 5, h / 4);
        ctx.lineTo(-w / 2 - Math.random() * flameLength, h / 4);
        ctx.lineTo(-w / 2 + 5, h / 4 - 5);
        ctx.stroke();
      }
    }
  },
  shuttle: {
    id: 'shuttle',
    name: 'Space Shuttle',
    baseColor: '#f1f5f9',
    width: 50,
    height: 25,
    draw: (ctx, w, h, color, thrusting, boost) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 4, h / 3);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(-w / 3, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(w / 4, -h / 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-w/2, -h/4, w/6, h/2);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(w/3, 0, w/6, h/6, 0, 0, Math.PI*2);
      ctx.fill();

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        const flameLength = boost ? 30 : 20;
        ctx.moveTo(-w / 3, 0);
        ctx.lineTo(-w / 2 - Math.random() * flameLength - 10, 0);
        ctx.lineTo(-w / 3, 5);
        ctx.moveTo(-w / 3, 0);
        ctx.lineTo(-w / 2 - Math.random() * flameLength - 10, 0);
        ctx.lineTo(-w / 3, -5);
        ctx.stroke();
      }
    }
  },
  cruiser: {
    id: 'cruiser',
    name: 'Star Cruiser',
    baseColor: '#ec4899',
    width: 55,
    height: 40,
    draw: (ctx, w, h, color, thrusting, boost) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(0, h / 3);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(-w / 8, h / 6);
      ctx.lineTo(-w / 4, 0);
      ctx.lineTo(-w / 8, -h / 6);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(0, -h / 3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w/4, 0);
      ctx.lineTo(w/4, 0);
      ctx.stroke();

      if (thrusting || boost) {
        ctx.fillStyle = boost ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        const flameLength = boost ? 25 : 15;
        ctx.moveTo(-w/8, -h/4);
        ctx.lineTo(-w/2 - Math.random() * flameLength, -h/3);
        ctx.lineTo(-w/6, -h/6);
        ctx.moveTo(-w/8, h/4);
        ctx.lineTo(-w/2 - Math.random() * flameLength, h/3);
        ctx.lineTo(-w/6, h/6);
        ctx.stroke();
      }
    }
  }
};
