
import { GameState, Snake, Food, Particle, FloatingText, GameConfig, KillEvent, Point } from '../types';
import { MAP_SIZE, INITIAL_LENGTH, SEGMENT_SPACING, BASE_SPEED, BOOST_SPEED, TURN_SPEED, SNAKE_WIDTH, BOOST_COST_PER_TICK, SKINS, BOT_NAMES, PARTICLE_COUNT_ON_DEATH, ZOOM_DEFAULT, ZOOM_MIN } from '../constants';
import { distance, distanceSq, angleBetween, lerpAngle, uuid, randomRange } from '../utils/gameUtils';

// Optimization: Limit food count
const MAX_FOOD = 800;
const PLAYER_COUNT = 50;

export class GameEngine {
  public state: GameState;
  private config: GameConfig;
  private lastTime: number = 0;
  private playerId: string = 'player-1';
  private zoneShrinkRate: number = 0.5; // Pixels per frame

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    // --- ECONOMY INITIALIZATION ---
    const totalCollected = PLAYER_COUNT * this.config.entryFee;
    const platformFee = totalCollected * 0.10; // 10% Platform Fee
    const netPot = totalCollected - platformFee; // 90% Prize Pool (Total Liquidity on Map)

    // Economy Distribution
    // 20% of Pot -> Initial Snake Balances
    // 80% of Pot -> Initial Food on Map
    const playerAllocation = 0.20; 
    const foodAllocation = 0.80;
    
    const startingBalancePerPlayer = (netPot * playerAllocation) / PLAYER_COUNT;
    const initialFoodBudget = netPot * foodAllocation;
    
    const snakes = new Map<string, Snake>();
    
    // Create Player
    const player = this.createSnake(this.playerId, this.config.playerName || "Player", false, startingBalancePerPlayer);
    snakes.set(player.id, player);

    // Create Bots
    for (let i = 0; i < PLAYER_COUNT - 1; i++) { 
      const botId = uuid();
      const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      snakes.set(botId, this.createSnake(botId, botName, true, startingBalancePerPlayer));
    }

    // Create Initial Food from Budget
    const foods: Food[] = [];
    // Determine number of food items based on MAX_FOOD and budget
    const foodCount = Math.min(MAX_FOOD, 1000); 
    const avgFoodValue = initialFoodBudget / foodCount;

    // We pre-generate food here. We need to be careful not to rely on 'this.state' 
    // inside createFood during initialization if it depends on state props.
    for (let i = 0; i < foodCount; i++) {
       // Spawn randomly on map
       const x = randomRange(50, MAP_SIZE - 50);
       const y = randomRange(50, MAP_SIZE - 50);
       foods.push(this.createFoodInternal(x, y, avgFoodValue));
    }

    return {
      status: 'PLAYING',
      snakes,
      foods,
      particles: [],
      texts: [],
      killFeed: [],
      camera: {
        x: player.segments[0].x,
        y: player.segments[0].y,
        targetX: player.segments[0].x,
        targetY: player.segments[0].y,
        zoom: 1,
        targetZoom: 1
      },
      mapSize: MAP_SIZE,
      safeZoneSize: MAP_SIZE,
      
      // BR State
      pot: netPot,
      reserveBank: 0, // Any rounding errors or future burns go here
      entryFee: this.config.entryFee,
      totalPlayers: PLAYER_COUNT,
      aliveCount: PLAYER_COUNT,
      eliminatedSnakes: [],

      leaderboard: [],
      spectatingID: this.playerId,
      playerStats: { kills: 0, finalScore: 0, rank: PLAYER_COUNT, payout: 0 }
    };
  }

  private createSnake(id: string, name: string, isBot: boolean, startScore: number): Snake {
    const padding = 800;
    const startX = randomRange(padding, MAP_SIZE - padding);
    const startY = randomRange(padding, MAP_SIZE - padding);
    
    const segments = [];
    // Calculate length based on score to make them look substantial even with low $
    const displayLength = INITIAL_LENGTH + Math.floor(startScore * 2); 

    for (let i = 0; i < displayLength; i++) {
      segments.push({ x: startX, y: startY + i * SEGMENT_SPACING });
    }

    const skin = isBot 
      ? SKINS[Math.floor(Math.random() * SKINS.length)] 
      : SKINS.find(s => s.id === this.config.selectedSkinId) || SKINS[0];

    // Initial Bounds
    const bounds = {
      minX: startX,
      minY: startY,
      maxX: startX,
      maxY: startY
    };

    return {
      id,
      name,
      segments,
      angle: Math.random() * Math.PI * 2,
      targetAngle: 0,
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      boostSpeed: BOOST_SPEED,
      turnSpeed: TURN_SPEED,
      width: SNAKE_WIDTH,
      skin,
      isBoosting: false,
      length: displayLength,
      score: Math.max(0, startScore),
      isBot,
      isDead: false,
      bounds
    };
  }

  // Helper to create food without relying on this.state
  private createFoodInternal(x: number, y: number, value: number): Food {
    const radius = Math.min(12, Math.max(3, value * 0.8));
    const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'];
    
    return {
      id: uuid(),
      x,
      y,
      value: Math.max(0.1, value), // Ensure food always has positive value
      radius,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulsePhase: Math.random() * Math.PI * 2
    };
  }

  private createFood(x?: number, y?: number, value?: number): Food {
    let spawnX = x;
    let spawnY = y;
    let spawnValue = value || 1;

    if (spawnX === undefined) {
        // Bias towards safe zone
        const currentSafeZone = this.state ? this.state.safeZoneSize : MAP_SIZE;
        const r = currentSafeZone / 2;
        const cx = MAP_SIZE / 2;
        const cy = MAP_SIZE / 2;
        
        // 80% Spawn in Safe Zone
        if (Math.random() < 0.8) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * r;
            spawnX = cx + Math.cos(angle) * dist;
            spawnY = cy + Math.sin(angle) * dist;
        } else {
            spawnX = randomRange(50, MAP_SIZE - 50);
            spawnY = randomRange(50, MAP_SIZE - 50);
        }
    }

    return this.createFoodInternal(spawnX!, spawnY!, spawnValue);
  }

  public update(time: number, inputAngle: number, isBoosting: boolean) {
    const dt = Math.min((time - this.lastTime) / 16.67, 2); 
    this.lastTime = time;

    if (this.state.status === 'GAME_OVER' || this.state.status === 'VICTORY') {
       this.updateCamera();
       this.updateParticles(dt);
       return;
    }

    // --- BATTLE ROYALE LOGIC ---
    
    // 1. Shrink Zone
    if (this.state.safeZoneSize > 300) {
        this.state.safeZoneSize -= this.zoneShrinkRate * dt;
    }
    
    // 2. Update Player Input
    const player = this.state.snakes.get(this.playerId);
    if (player && !player.isDead) {
      player.targetAngle = inputAngle;
      player.isBoosting = isBoosting && player.score > 1; // Minimal score needed to boost
    }

    // 3. Update All Snakes
    let activeSnakes = 0;
    this.state.snakes.forEach(snake => {
      if (snake.isDead) return;
      activeSnakes++;
      this.updateSnakePhysics(snake, dt);
      this.updateBotAI(snake);
      this.checkCollisions(snake);
    });
    
    this.state.aliveCount = activeSnakes;

    // 4. Cleanup Dead Snakes
    this.state.snakes.forEach((snake, key) => {
      if (snake.isDead) {
        this.handleSnakeDeath(snake);
        this.state.snakes.delete(key);
      }
    });

    // 5. Check Victory Condition
    if (activeSnakes === 1 && this.state.status === 'PLAYING') {
        this.handleVictory();
    }

    // 6. Economy Recycling (Spawn Food from ReserveBank)
    // If we have money in the bank (from burns/tax) and space on map
    if (this.state.reserveBank > 5 && this.state.foods.length < MAX_FOOD) {
        const spawnCount = Math.min(5, Math.ceil(this.state.reserveBank / 5));
        for (let i=0; i < spawnCount; i++) {
            if (this.state.reserveBank < 1) break;
            
            // Spawn small chunks
            const val = Math.min(5, Math.max(1, this.state.reserveBank * 0.1));
            this.state.reserveBank -= val;
            this.state.foods.push(this.createFood(undefined, undefined, val));
        }
    }

    // 7. Visual Updates
    this.updateCamera();
    this.updateParticles(dt);
    this.updateLeaderboard();
  }

  private updateSnakePhysics(snake: Snake, dt: number) {
    // Turn
    snake.angle = lerpAngle(snake.angle, snake.targetAngle, snake.turnSpeed * dt);
    
    // Speed
    const currentSpeed = snake.isBoosting ? snake.boostSpeed : snake.baseSpeed;
    const sizeMalus = Math.min(0.5, snake.length / 1000); // Adjusted size malus scaling
    snake.speed = currentSpeed * (1 - sizeMalus);

    // Move Head
    const head = snake.segments[0];
    const velocity = {
      x: Math.cos(snake.angle) * snake.speed * dt,
      y: Math.sin(snake.angle) * snake.speed * dt
    };

    const nextX = head.x + velocity.x;
    const nextY = head.y + velocity.y;
    
    // Map Boundaries (Hard Wall)
    if (nextX < 0 || nextX > MAP_SIZE || nextY < 0 || nextY > MAP_SIZE) {
      snake.isDead = true;
      return;
    }
    
    // Zone Logic (Soft Damage - Taxed to Reserve)
    const centerX = MAP_SIZE / 2;
    const centerY = MAP_SIZE / 2;
    const halfZone = this.state.safeZoneSize / 2;
    
    if (
        nextX < centerX - halfZone || 
        nextX > centerX + halfZone ||
        nextY < centerY - halfZone ||
        nextY > centerY + halfZone
    ) {
        // Burn score
        const damage = 0.5 * dt;
        const actualDamage = Math.min(snake.score, damage);
        
        snake.score -= actualDamage;
        this.state.reserveBank += actualDamage; // Recycle burned money

        if (snake.score <= 0.1) {
            snake.score = 0;
            snake.isDead = true;
            return;
        }
    }

    // Move Body
    const newHead = { x: nextX, y: nextY };
    snake.segments.unshift(newHead);

    // Boost Cost (Recycled)
    if (snake.isBoosting) {
      const cost = BOOST_COST_PER_TICK * dt;
      const actualCost = Math.min(snake.score, cost);
      
      snake.score -= actualCost;
      this.state.reserveBank += actualCost; 
      
      if (snake.score <= 1) {
          snake.isBoosting = false;
      }
      
      if (snake.isBoosting && this.state.reserveBank > 1.5 && Math.random() < 0.15) {
          const dropVal = 1.5;
          this.state.reserveBank -= dropVal;
          const tail = snake.segments[snake.segments.length - 1];
          this.state.foods.push(this.createFoodInternal(tail.x, tail.y, dropVal));
      }
    }

    snake.score = Math.max(0, snake.score);

    // Maintain Length based on Score
    const targetLength = INITIAL_LENGTH + Math.floor(Math.max(0, snake.score) * 2);
    if (snake.segments.length > targetLength) {
       snake.segments.pop();
    }

    // --- OPTIMIZATION: Update Bounding Box ---
    // Instead of iterating all segments every time to find min/max, 
    // we assume the bounding box grows with the head and potentially shrinks (loose bounds).
    // For perfect bounds we would need to iterate, but for collision culling, loose bounds are fine.
    // However, to be safe and accurate, let's iterate. Since we do this once per snake per frame, it's O(N * Length).
    // To make it O(N), we can rely on the fact that only head and tail change significantly.
    // But since snakes coil, full iteration is safer. 
    // Optimization: Only update bounds every 4 frames or use a padding?
    // Let's iterate, but optimized.
    let minX = nextX;
    let maxX = nextX;
    let minY = nextY;
    let maxY = nextY;
    
    // Sample every 5th segment for bounds to speed up loop
    for(let i = 0; i < snake.segments.length; i+=5) {
        const s = snake.segments[i];
        if(s.x < minX) minX = s.x;
        if(s.x > maxX) maxX = s.x;
        if(s.y < minY) minY = s.y;
        if(s.y > maxY) maxY = s.y;
    }
    // Ensure tail is included
    const tail = snake.segments[snake.segments.length-1];
    if(tail.x < minX) minX = tail.x;
    if(tail.x > maxX) maxX = tail.x;
    if(tail.y < minY) minY = tail.y;
    if(tail.y > maxY) maxY = tail.y;

    snake.bounds = { 
        minX: minX - snake.width, 
        maxX: maxX + snake.width, 
        minY: minY - snake.width, 
        maxY: maxY + snake.width 
    };
  }

  private updateBotAI(snake: Snake) {
    if (!snake.isBot) return;

    const head = snake.segments[0];
    const centerX = MAP_SIZE / 2;
    const centerY = MAP_SIZE / 2;
    const halfZone = this.state.safeZoneSize / 2;

    // 1. Stay in Zone Priority
    const safeBuffer = 100;
    const inDangerX = head.x < centerX - halfZone + safeBuffer || head.x > centerX + halfZone - safeBuffer;
    const inDangerY = head.y < centerY - halfZone + safeBuffer || head.y > centerY + halfZone - safeBuffer;

    if (inDangerX || inDangerY) {
        // Move towards center
        snake.targetAngle = angleBetween(head, {x: centerX, y: centerY});
        snake.isBoosting = true;
        return;
    }

    // 2. Standard Logic
    if (Math.random() < 0.1) {
        let target: Point | null = null;
        let minDistSq = 600 * 600;
        
        // Optimization: Don't check all food, just random samples
        for (let i=0; i<10; i++) {
           const f = this.state.foods[Math.floor(Math.random() * this.state.foods.length)];
           if (!f) continue;
           const dSq = distanceSq(head, f);
           if (dSq < minDistSq) {
               minDistSq = dSq;
               target = f;
           }
        }
        
        if (target) {
           snake.targetAngle = angleBetween(head, target);
        }
    }

    if (Math.random() < 0.05) {
      snake.targetAngle += randomRange(-0.5, 0.5);
    }
    
    snake.isBoosting = snake.score > 20 && Math.random() < 0.01;
    if (snake.score < 5) snake.isBoosting = false;
  }

  private checkCollisions(snake: Snake) {
    const head = snake.segments[0];
    const pickupRadius = snake.width + (snake.score / 500);
    const pickupRadiusSq = pickupRadius * pickupRadius;

    // Eat Food - Optimized Loop
    // For huge food arrays, spatial grid is best, but here we optimization simple loop
    // by checking quick absolute distance first
    for (let i = this.state.foods.length - 1; i >= 0; i--) {
      const food = this.state.foods[i];
      // Fast Rect Check (Pre-calculation)
      if (Math.abs(head.x - food.x) > pickupRadius + 20) continue;
      if (Math.abs(head.y - food.y) > pickupRadius + 20) continue;

      if (distanceSq(head, food) < pickupRadiusSq) {
        snake.score += food.value; 
        this.state.foods.splice(i, 1);
      }
    }

    // Hit Other Snakes
    for (const other of this.state.snakes.values()) {
      if (other.isDead) continue; 
      if (snake.id === other.id) continue; 

      // --- OPTIMIZATION: Broad Phase Check using Bounds ---
      // If the bounding boxes don't intersect, don't even check segments
      if (head.x < other.bounds.minX || head.x > other.bounds.maxX ||
          head.y < other.bounds.minY || head.y > other.bounds.maxY) {
          continue;
      }

      const collisionDistSq = ((snake.width + other.width) * 0.4) ** 2;
      let step = 5; 
      
      // Optimization: start from 0 if head-on-head is possible, otherwise can skip a bit
      for (let i = 0; i < other.segments.length; i += step) {
        const seg = other.segments[i];
        
        // Fast segment check
        if (Math.abs(head.x - seg.x) > 40) continue;
        if (Math.abs(head.y - seg.y) > 40) continue;

        if (distanceSq(head, seg) < collisionDistSq) {
          snake.isDead = true;
          snake.eliminatedBy = other.id;
          
          this.state.killFeed.unshift({
             killerName: other.name,
             victimName: snake.name,
             timestamp: Date.now()
          });
          if (this.state.killFeed.length > 5) this.state.killFeed.pop();

          if (other.id === this.playerId) {
             this.state.playerStats.kills++;
          }
          return;
        }
      }
    }
  }

  private handleSnakeDeath(snake: Snake) {
    const placement = this.state.aliveCount + 1;
    this.state.eliminatedSnakes.push({
        id: snake.id,
        name: snake.name,
        finalScore: Math.max(0, snake.score), 
        placement: placement
    });

    const availableScore = Math.max(0, snake.score);
    const valueToDrop = availableScore * 0.7; 
    const valueToTax = availableScore * 0.3;
    this.state.reserveBank += valueToTax;

    const chunks = Math.min(50, Math.floor(valueToDrop / 2)); 
    const valPerChunk = chunks > 0 ? valueToDrop / chunks : 0;

    for (let i = 0; i < chunks; i++) {
      const segIndex = Math.floor((i / chunks) * snake.segments.length);
      const seg = snake.segments[segIndex] || snake.segments[0];
      this.state.foods.push(
        this.createFoodInternal(
            seg.x + randomRange(-20, 20), 
            seg.y + randomRange(-20, 20), 
            valPerChunk
        )
      );
    }

    const head = snake.segments[0];
    for (let i = 0; i < PARTICLE_COUNT_ON_DEATH; i++) {
      const mixDetail = Math.random() > 0.5;
      const pColor = mixDetail ? snake.skin.detailColor : snake.skin.color;
      
      this.state.particles.push({
        id: uuid(),
        x: head.x,
        y: head.y,
        vx: randomRange(-12, 12),
        vy: randomRange(-12, 12),
        life: randomRange(40, 80),
        maxLife: 80,
        color: pColor,
        size: randomRange(2, 6),
        decay: 0.9,
        history: [] 
      });
    }

    if (snake.id === this.playerId) {
      this.state.status = 'GAME_OVER';
      this.state.playerStats.finalScore = availableScore;
      this.state.playerStats.rank = placement;
      this.calculatePayout(); 

      if (snake.eliminatedBy && this.state.snakes.has(snake.eliminatedBy)) {
          this.state.spectatingID = snake.eliminatedBy;
      } else {
          this.findNewSpectatorTarget();
      }
    } else if (snake.id === this.state.spectatingID) {
        this.findNewSpectatorTarget();
    }
  }

  private handleVictory() {
      const winner = Array.from(this.state.snakes.values()).find(s => !s.isDead);
      if (winner) {
          const finalScore = Math.max(0, winner.score);
          this.state.eliminatedSnakes.push({
              id: winner.id,
              name: winner.name,
              finalScore: finalScore,
              placement: 1
          });

          if (winner.id === this.playerId) {
              this.state.status = 'VICTORY';
              this.state.playerStats.rank = 1;
              this.state.playerStats.finalScore = finalScore;
          } else {
              this.state.status = 'GAME_OVER';
          }
      }
      this.calculatePayout();
  }

  private calculatePayout() {
      const myEntry = this.state.eliminatedSnakes.find(e => e.id === this.playerId);
      if (!myEntry) {
          this.state.playerStats.payout = 0;
          return;
      }

      if (myEntry.placement <= 3) {
          this.state.playerStats.payout = Math.floor(myEntry.finalScore);
      } else {
          this.state.playerStats.payout = 0;
      }
  }

  private findNewSpectatorTarget() {
      let maxScore = -1;
      let maxId = '';
      this.state.snakes.forEach(s => {
           if (!s.isDead && s.score > maxScore) { maxScore = s.score; maxId = s.id; }
      });
      if (maxId) {
          this.state.spectatingID = maxId;
      }
  }

  private updateParticles(dt: number) {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.history.unshift({ x: p.x, y: p.y });
      if (p.history.length > 10) p.history.pop();

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      if (p.life <= 0) this.state.particles.splice(i, 1);
    }
  }

  private updateCamera() {
    const targetId = (this.state.status === 'PLAYING') ? this.playerId : this.state.spectatingID;
    const targetSnake = targetId ? this.state.snakes.get(targetId) : null;

    if (targetSnake) {
        const head = targetSnake.segments[0];
        this.state.camera.targetX = head.x;
        this.state.camera.targetY = head.y;
        
        const sizeFactor = Math.min(3, targetSnake.length / 250);
        this.state.camera.targetZoom = Math.max(ZOOM_MIN, ZOOM_DEFAULT - sizeFactor * 0.2);
    }

    const cam = this.state.camera;
    cam.x += (cam.targetX - cam.x) * 0.08;
    cam.y += (cam.targetY - cam.y) * 0.08;
    cam.zoom += (cam.targetZoom - cam.zoom) * 0.05;
  }

  private updateLeaderboard() {
      const alive = Array.from(this.state.snakes.values()).filter(s => !s.isDead);
      
      this.state.leaderboard = alive
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(s => ({ id: s.id, name: s.name, score: s.score }));
      
      if (this.state.status === 'PLAYING') {
          const p = this.state.snakes.get(this.playerId);
          if (p) {
               this.state.playerStats.rank = this.state.snakes.size - this.state.eliminatedSnakes.length;
          }
      }
  }
}
