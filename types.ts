
export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Skin {
  id: string;
  name: string;
  color: string;
  detailColor: string; // Scales/Pattern
  price: number;
}

export interface SnakeSegment {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  name: string;
  segments: SnakeSegment[];
  angle: number;
  targetAngle: number;
  speed: number;
  baseSpeed: number;
  boostSpeed: number;
  turnSpeed: number;
  width: number;
  skin: Skin;
  isBoosting: boolean;
  length: number; // Target length (segments count)
  score: number; // Mass/Score (Acts as Balance)
  isBot: boolean;
  isDead: boolean;
  eliminatedBy?: string;
  bounds: Bounds; // Optimization: Bounding box for culling
}

export interface Food {
  id: string;
  x: number;
  y: number;
  value: number;
  radius: number;
  color: string;
  pulsePhase: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  decay: number;
  history: Point[]; // Trail history
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  zoom: number;
  targetZoom: number;
}

export interface GameConfig {
  playerName: string;
  selectedSkinId: string;
  walletAddress?: string;
  entryFee: number;
}

export interface KillEvent {
  killerName: string;
  victimName: string;
  timestamp: number;
}

export interface GameState {
  status: 'MENU' | 'PLAYING' | 'GAME_OVER' | 'VICTORY';
  snakes: Map<string, Snake>;
  foods: Food[];
  particles: Particle[];
  texts: FloatingText[];
  killFeed: KillEvent[];
  camera: Camera;
  mapSize: number;
  safeZoneSize: number; // For Battle Royale shrinking zone
  
  // Battle Royale State
  pot: number; // The Net Pot (Prize Pool)
  reserveBank: number; // Money currently removed from board (burned/taxed), waiting to respawn
  entryFee: number;
  totalPlayers: number;
  aliveCount: number;
  eliminatedSnakes: { id: string; name: string; finalScore: number; placement: number }[]; // Track order of death

  leaderboard: { id: string; name: string; score: number }[];
  spectatingID?: string;
  playerStats: {
    kills: number;
    rank: number; // Current estimated rank
    finalScore: number;
    payout: number; // Share of the pot
  };
}
