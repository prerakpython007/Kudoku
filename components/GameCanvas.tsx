
import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GameRenderer } from '../game/GameRenderer';
import { GameConfig, GameState } from '../types';

interface GameCanvasProps {
  config: GameConfig;
  onGameStateChange: (state: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ config, onGameStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const requestRef = useRef<number>(0);
  const inputRef = useRef({ angle: 0, boosting: false });
  const lastUiSyncRef = useRef<number>(0);

  // Initialize Game
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create instances
    engineRef.current = new GameEngine(config);
    rendererRef.current = new GameRenderer(canvasRef.current);

    const loop = (time: number) => {
      const engine = engineRef.current;
      const renderer = rendererRef.current;
      if (!engine || !renderer) return;

      // 1. Logic Update
      engine.update(time, inputRef.current.angle, inputRef.current.boosting);

      // 2. Render (Pass time for procedural animations)
      renderer.render(engine.state, time);

      // 3. Sync State to UI
      // Throttle to ~15 FPS for UI updates to prevent React reconciliation lag
      if (time - lastUiSyncRef.current > 60) { 
         onGameStateChange({ ...engine.state });
         lastUiSyncRef.current = time;
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); 

  // Input Handling
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!canvasRef.current || !engineRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      inputRef.current.angle = Math.atan2(mouseY - centerY, mouseX - centerX);
  };

  const handleMouseDown = () => { inputRef.current.boosting = true; };
  const handleMouseUp = () => { inputRef.current.boosting = false; };

  // Resize Observer
  useEffect(() => {
      const handleResize = () => {
          if (canvasRef.current && rendererRef.current) {
              rendererRef.current.resize(window.innerWidth, window.innerHeight);
          }
      };
      window.addEventListener('resize', handleResize);
      handleResize(); // Initial sizing
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-crosshair touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default GameCanvas;
