

import { GameState, Snake, SnakeSegment, Point, Skin, Rect } from '../types';
import { COLOR_BG, COLOR_GRID, MAP_SIZE, GRID_SIZE } from '../constants';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private frame: number = 0;
  
  // Cache multiple variants per skin to allow for randomized texturing on segments
  private spriteCache: Map<string, HTMLCanvasElement[]> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error("Failed to get canvas context");
    this.ctx = context;
  }

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;
  }

  public render(state: GameState, time: number) {
    this.frame++;
    const { ctx, width, height } = this;
    const { camera } = state;

    // 1. Clear Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // 2. Camera Transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Calculate visible area for culling
    const viewW = width / camera.zoom;
    const viewH = height / camera.zoom;
    const viewRect = {
        x: camera.x - viewW / 2 - 100, // Add buffer
        y: camera.y - viewH / 2 - 100,
        w: viewW + 200,
        h: viewH + 200
    };

    // 3. Draw World
    this.drawGrid(camera);
    this.drawMapBorder(state); 
    
    // 4. Draw Food
    this.drawFoods(state, time, viewRect);

    // 5. Draw Snakes
    // Optimization: Sort by Y for depth, but only process potential candidates
    const sortedSnakes = Array.from(state.snakes.values()).sort((a, b) => a.segments[0].y - b.segments[0].y);
    
    for (const snake of sortedSnakes) {
        // --- OPTIMIZATION: Bounds Culling ---
        // If snake's bounding box doesn't overlap the view, skip entirely
        if (snake.bounds.maxX < viewRect.x || 
            snake.bounds.minX > viewRect.x + viewRect.w ||
            snake.bounds.maxY < viewRect.y || 
            snake.bounds.minY > viewRect.y + viewRect.h) {
            continue;
        }

        if (!this.spriteCache.has(snake.skin.id)) {
            this.generateSprite(snake.skin);
        }
        this.drawSnake(snake, time);
    }

    // 6. Draw Particles
    this.drawParticles(state);

    // 7. Names and Bars (UI in World Space)
    this.drawSnakeNames(sortedSnakes, viewRect);

    ctx.restore();
  }

  private generateSprite(skin: Skin) {
      const variants: HTMLCanvasElement[] = [];
      const variantCount = 5; // Generate 5 variants to randomize segments
      const size = 64; 
      const center = size / 2;
      const radius = size / 2;

      for (let v = 0; v < variantCount; v++) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // 1. Base Gradient (Deep rich sphere)
          const grad = ctx.createRadialGradient(
              center - radius * 0.2, center - radius * 0.2, radius * 0.1,
              center, center, radius
          );
          
          grad.addColorStop(0, skin.detailColor);
          grad.addColorStop(0.5, skin.color);
          const darkColor = this.shadeColor(skin.color, -0.4);
          grad.addColorStop(1, darkColor);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(center, center, radius, 0, Math.PI * 2);
          ctx.fill();

          // 2. Randomized Scale Texture Overlay
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, radius, 0, Math.PI * 2);
          ctx.clip();

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 1;
          
          const scaleSize = 8;
          // Draw staggered grid of scales
          for (let y = -scaleSize; y < size + scaleSize; y += scaleSize * 0.7) {
              const row = Math.round(y / (scaleSize * 0.7));
              const xOffset = (row % 2) * (scaleSize / 2);
              
              for (let x = -scaleSize; x < size + scaleSize; x += scaleSize) {
                  const rx = x + xOffset + (Math.random() - 0.5) * 3;
                  const ry = y + (Math.random() - 0.5) * 3;
                  
                  if (Math.hypot(rx - center, ry - center) > radius) continue;

                  const sRadius = (scaleSize / 2) * (0.8 + Math.random() * 0.3);
                  
                  ctx.beginPath();
                  ctx.arc(rx, ry, sRadius, 0, Math.PI * 2);
                  ctx.stroke();
                  
                  if (Math.random() > 0.75) {
                      ctx.fillStyle = 'rgba(0,0,0,0.08)';
                      ctx.fill();
                  }
              }
          }
          ctx.restore();

          // 3. Highlight/Gloss (Top Left)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.ellipse(center, center - radius*0.4, radius*0.4, radius*0.2, 0, 0, Math.PI*2);
          ctx.fill();
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(center - radius*0.3, center - radius*0.4, 2, 0, Math.PI*2);
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(center, center, radius - 1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.stroke();

          variants.push(canvas);
      }

      this.spriteCache.set(skin.id, variants);
  }

  private drawGrid(camera: any) {
    const { ctx } = this;
    const startX = Math.floor((camera.x - (this.width / camera.zoom) / 2) / GRID_SIZE) * GRID_SIZE;
    const endX = Math.floor((camera.x + (this.width / camera.zoom) / 2) / GRID_SIZE) * GRID_SIZE + GRID_SIZE;
    const startY = Math.floor((camera.y - (this.height / camera.zoom) / 2) / GRID_SIZE) * GRID_SIZE;
    const endY = Math.floor((camera.y + (this.height / camera.zoom) / 2) / GRID_SIZE) * GRID_SIZE + GRID_SIZE;

    ctx.fillStyle = COLOR_GRID;
    for (let x = startX; x <= endX; x += GRID_SIZE) {
        for (let y = startY; y <= endY; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
  }

  private drawMapBorder(state: GameState) {
      const { ctx } = this;
      
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

      const zoneSize = state.safeZoneSize;
      const center = MAP_SIZE / 2;
      const x = center - zoneSize/2;
      const y = center - zoneSize/2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(-5000, -5000, MAP_SIZE + 10000, MAP_SIZE + 10000); 
      ctx.rect(x, y, zoneSize, zoneSize); 
      ctx.clip("evenodd");
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
      ctx.fill();
      
      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 10;
      ctx.strokeRect(x, y, zoneSize, zoneSize);
      
      ctx.restore();
  }

  private drawFoods(state: GameState, time: number, viewRect: Rect) {
    const { ctx } = this;
    
    // Optimization: Skip food outside view
    for (const food of state.foods) {
       if (food.x < viewRect.x || food.x > viewRect.x + viewRect.w ||
           food.y < viewRect.y || food.y > viewRect.y + viewRect.h) {
           continue;
       }

       const pulseSpeed = 0.008; 
       const pulse = Math.sin(time * pulseSpeed + food.pulsePhase);
       
       const scale = 1 + pulse * 0.15; 
       const r = food.radius * scale;

       if (r > 5) {
           ctx.save();
           ctx.globalAlpha = 0.3;
           ctx.fillStyle = food.color;
           ctx.beginPath();
           ctx.arc(food.x, food.y, r * 1.6, 0, Math.PI * 2);
           ctx.fill();
           ctx.restore();
       }

       ctx.fillStyle = food.color;
       ctx.beginPath();
       ctx.arc(food.x, food.y, r, 0, Math.PI * 2);
       ctx.fill();

       ctx.fillStyle = 'rgba(255,255,255,0.6)';
       ctx.beginPath();
       ctx.arc(food.x - r * 0.25, food.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
       ctx.fill();
       
       ctx.fillStyle = '#ffffff';
       ctx.beginPath();
       ctx.arc(food.x - r * 0.3, food.y - r * 0.3, r * 0.15, 0, Math.PI * 2);
       ctx.fill();
    }
  }

  private drawSnake(snake: Snake, time: number) {
    const { ctx } = this;
    const segments = snake.segments;
    if (segments.length === 0) return;

    const sprites = this.spriteCache.get(snake.skin.id);
    if (!sprites || sprites.length === 0) return;

    const isBoosting = snake.isBoosting;
    const wiggleAmp = isBoosting ? 1.0 : 3.5; 
    const waveSpeed = isBoosting ? 0.02 : 0.005;
    const waveFreq = 0.15;
    
    // Optimization: Draw simplified shadow (single path instead of individual circles)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'black';
    // Only draw shadow for every 2nd segment to save draw calls
    for (let i = segments.length - 1; i >= 0; i-=2) { 
        const p = segments[i];
        const size = i > segments.length - 5 ? (snake.width / 2) * ((segments.length - i)/5) : snake.width / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 8, size, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Body
    for (let i = segments.length - 1; i >= 0; i--) {
        const p = segments[i];
        let renderX = p.x;
        let renderY = p.y;

        // Optimization: Simplify wiggle math or skip for segments off screen?
        // Keep wiggle for visual quality, it's not the main bottleneck
        if (i > 1 && i < segments.length - 1) {
             const wave = Math.sin(i * waveFreq - time * waveSpeed);
             const offset = wave * wiggleAmp;
             
             // Approximate direction using just previous segment to avoid sqrt
             const prev = segments[i-1];
             const dx = prev.x - p.x; // Simplified from next
             const dy = prev.y - p.y;
             const distSq = dx*dx + dy*dy;
             
             if (distSq > 0.1) {
                const dist = Math.sqrt(distSq); // Only sqrt if needed for wiggle
                renderX += (-dy / dist) * offset;
                renderY += (dx / dist) * offset;
             }
        }

        const size = i > segments.length - 5 ? (snake.width / 2) * ((segments.length - i)/5) : snake.width / 2;
        const spriteIndex = i % sprites.length;
        const sprite = sprites[spriteIndex];

        ctx.drawImage(sprite, renderX - size, renderY - size, size * 2, size * 2);
    }

    // Eyes
    const head = segments[0]; 
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(snake.angle);
    
    // Optimization: Inline eye drawing to avoid function call overhead in loop
    // Left Eye
    ctx.translate(6, -7);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(3, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(4, -1, 1.5, 0, Math.PI*2); ctx.fill();

    // Right Eye
    ctx.translate(0, 14); // Move relative to left eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(3, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(4, -1, 1.5, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  private drawSnakeNames(snakes: Snake[], viewRect: Rect) {
      const { ctx } = this;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameFont = 'bold 13px Inter, sans-serif';
      const balanceFont = '900 16px DM Mono, monospace';

      for (const snake of snakes) {
          if (snake.isDead) continue;
          
          // Optimization: Bounds check
          if (snake.bounds.maxX < viewRect.x || snake.bounds.minX > viewRect.x + viewRect.w ||
              snake.bounds.maxY < viewRect.y || snake.bounds.minY > viewRect.y + viewRect.h) {
              continue;
          }

          const head = snake.segments[0];
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          const name = snake.name;
          ctx.font = nameFont;
          const textWidth = ctx.measureText(name).width; // Optimization: Could cache this
          
          const balanceText = `$${Math.floor(snake.score)}`;
          ctx.font = balanceFont;
          const balanceWidth = ctx.measureText(balanceText).width;

          const maxWidth = Math.max(textWidth, balanceWidth);
          const boxWidth = maxWidth + 16;
          const boxHeight = 42;
          const yOffset = 60;

          ctx.fillRect(head.x - boxWidth/2, head.y - yOffset, boxWidth, boxHeight);
          
          ctx.fillStyle = '#cbd5e1'; 
          ctx.font = nameFont;
          ctx.fillText(name, head.x, head.y - yOffset + 12);
          
          ctx.fillStyle = '#34d399'; 
          ctx.font = balanceFont;
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText(balanceText, head.x, head.y - yOffset + 30);
          ctx.shadowBlur = 0;
      }
  }

  private drawParticles(state: GameState) {
      const { ctx } = this;
      // Optimization: Particles are small, simple bounds check inside the loop is sufficient
      for (const p of state.particles) {
          if (!this.isOnScreen(p.x, p.y, state.camera)) continue;
          
          const alpha = p.life / p.maxLife;
          ctx.globalAlpha = alpha;
          
          if (p.history.length > 1) {
              ctx.beginPath();
              // Optimization: Combine line moves
              ctx.moveTo(p.history[0].x, p.history[0].y);
              for (let i = 1; i < p.history.length; i++) {
                  ctx.lineTo(p.history[i].x, p.history[i].y);
              }
              ctx.strokeStyle = p.color;
              ctx.lineWidth = Math.max(0.5, p.size * 0.5); // Simplified width
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.stroke();
          }

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.globalAlpha = 1.0;
      }
  }

  private isOnScreen(x: number, y: number, camera: any): boolean {
      const margin = 50;
      const w = this.width / camera.zoom;
      const h = this.height / camera.zoom;
      return (
          x > camera.x - w/2 - margin &&
          x < camera.x + w/2 + margin &&
          y > camera.y - h/2 - margin &&
          y < camera.y + h/2 + margin
      );
  }

  private shadeColor(color: string, percent: number) {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
  }
}
