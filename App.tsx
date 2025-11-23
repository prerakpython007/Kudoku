
import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import WalletModal from './components/WalletModal';
import Marketplace from './components/Marketplace';
import { GameState, GameConfig, Skin, Snake } from './types';
import { SKINS, MAP_SIZE } from './constants';
import { generateAICommentary } from './services/geminiService';

const App: React.FC = () => {
  const [isInGame, setIsInGame] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  
  // Web3 State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [balance, setBalance] = useState(1000); // More starting cash for betting
  const [ownedSkins, setOwnedSkins] = useState<string[]>(['blue']);
  
  // Battle Royale State
  const [entryFee, setEntryFee] = useState(50);
  
  // AI Commentary State
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const lastKillTimeRef = useRef<number>(0);
  
  const [config, setConfig] = useState<GameConfig>({
    playerName: '',
    selectedSkinId: 'blue',
    walletAddress: '',
    entryFee: 50
  });
  
  // Skin selection for preview
  const [skinIndex, setSkinIndex] = useState(0);

  const cycleSkin = (dir: number) => {
      let next = skinIndex + dir;
      if (next < 0) next = SKINS.length - 1;
      if (next >= SKINS.length) next = 0;
      setSkinIndex(next);
      setConfig(p => ({ ...p, selectedSkinId: SKINS[next].id }));
  };

  // Connect Wallet Handler
  const handleConnect = () => {
    setTimeout(() => {
        const mockAddr = '0x' + Array(40).fill(0).map(()=>Math.floor(Math.random()*16).toString(16)).join('');
        setWalletAddress(mockAddr);
        setConfig(c => ({ ...c, walletAddress: mockAddr, playerName: 'Ronin_' + mockAddr.slice(2,6) }));
        setIsWalletModalOpen(false);
    }, 800);
  };

  const handlePurchase = (skin: Skin) => {
      if (balance >= skin.price) {
          setBalance(b => b - skin.price);
          setOwnedSkins(prev => [...prev, skin.id]);
      }
  };

  const handleEquip = (skin: Skin) => {
      setConfig(c => ({ ...c, selectedSkinId: skin.id }));
      const idx = SKINS.findIndex(s => s.id === skin.id);
      if (idx !== -1) setSkinIndex(idx);
  };

  const startGame = () => {
     if (!walletAddress) {
         setIsWalletModalOpen(true);
         return;
     }
     if (balance < entryFee) {
         alert("Insufficient funds for tribute!");
         return;
     }

     // Deduct Entry Fee
     setBalance(b => b - entryFee);
     setConfig(c => ({...c, entryFee: entryFee}));

     setIsInGame(true);
     
     // Calculate Net Pot for display in commentary
     const totalCollected = entryFee * 50;
     const netPot = totalCollected * 0.9;

     setAiCommentary(`THE GATES OPEN. POT: $${netPot}. ONLY THE TOP 3 SHALL SURVIVE.`);
     setIsAiSpeaking(true);
     setTimeout(() => setIsAiSpeaking(false), 3000);
  };

  const handleExit = () => {
      // Collect payout
      if (gameState && gameState.playerStats.payout > 0) {
          setBalance(b => b + gameState.playerStats.payout);
      }
      setIsInGame(false);
      setGameState(null);
  };

  // AI Commentary Effect
  useEffect(() => {
      if (!gameState || !isInGame) return;

      const checkEvents = async () => {
          // 1. Check Kills
          if (gameState.killFeed.length > 0) {
              const latest = gameState.killFeed[0];
              if (latest.timestamp > lastKillTimeRef.current) {
                  lastKillTimeRef.current = latest.timestamp;
                  
                  const isPlayerKiller = latest.killerName === config.playerName;
                  if (isPlayerKiller) {
                      const text = await generateAICommentary('KILL', config.playerName, gameState.snakes.get('player-1')?.score || 0);
                      setAiCommentary(text);
                      setIsAiSpeaking(true);
                      setTimeout(() => setIsAiSpeaking(false), 4000);
                  }
              }
          }
          
          // 2. Victory / Game Over
          if ((gameState.status === 'GAME_OVER' || gameState.status === 'VICTORY') && !isAiSpeaking) {
               const text = await generateAICommentary(gameState.status, config.playerName, gameState.playerStats.finalScore);
               setAiCommentary(text);
               setIsAiSpeaking(true);
          }
      };

      checkEvents();
  }, [gameState?.killFeed, gameState?.status, isInGame]);

  const currentSkin = SKINS[skinIndex];

  // Menu Calculations (Hidden Fee)
  const prizePool = entryFee * 50 * 0.9;

  return (
    <div className="relative w-screen h-screen bg-[#0c0a09] text-[#e7e5e4] font-serif overflow-hidden select-none">
      
      {isWalletModalOpen && (
          <WalletModal onConnect={handleConnect} onClose={() => setIsWalletModalOpen(false)} />
      )}
      
      {isMarketplaceOpen && (
          <Marketplace 
            balance={balance}
            currentSkinId={config.selectedSkinId}
            ownedSkins={ownedSkins}
            onPurchase={handlePurchase}
            onEquip={handleEquip}
            onClose={() => setIsMarketplaceOpen(false)}
          />
      )}

      {isInGame ? (
        <>
            <GameCanvas config={config} onGameStateChange={setGameState} />
            
            {/* HUD Layer */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between font-serif">
                
                {/* Top HUD: Battle Royale Stats */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                         {/* Wallet & Pot Info */}
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-[#1c1917]/90 border border-[#78350f] px-6 py-2 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#b91c1c]"></div>
                                <span className="text-xs font-bold text-[#a8a29e] tracking-widest uppercase">Alive</span>
                                <span className="text-xl font-bold text-white">{gameState?.aliveCount}<span className="text-xs text-[#a8a29e] ml-1">/{gameState?.totalPlayers}</span></span>
                            </div>

                            <div className="flex items-center gap-2 bg-[#1c1917]/90 border border-[#b45309] px-6 py-2 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#f59e0b]"></div>
                                <span className="text-xs font-bold text-[#d97706] tracking-widest uppercase">Bounty Pool</span>
                                <span className="text-xl font-bold text-[#fcd34d]">${Math.floor(gameState?.pot || 0)}</span>
                            </div>
                         </div>

                         <div className="mt-2 bg-[#0c0a09]/80 p-3 border-l-4 border-[#10b981] w-48">
                             <div className="text-[10px] text-[#a8a29e] uppercase tracking-widest font-bold">Current Loot</div>
                             <div className="text-2xl font-bold font-mono text-[#34d399]">
                                 ${Math.max(0, Math.floor(gameState?.snakes.get('player-1')?.score || 0))}
                             </div>
                         </div>
                    </div>

                    {/* Kill Feed */}
                    <div className="flex flex-col gap-1 items-end w-72">
                        {gameState?.killFeed.map((kill, i) => (
                            <div key={kill.timestamp + i} className="text-xs text-[#e7e5e4] bg-[#292524]/80 px-3 py-1.5 border-r-2 border-[#b91c1c] animate-fade-in font-serif">
                                <span className="font-bold text-[#fca5a5]">{kill.killerName}</span> 
                                <span className="text-[#a8a29e] mx-2 italic">slain</span> 
                                <span className="text-[#d6d3d1]">{kill.victimName}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Commentary */}
                {isAiSpeaking && (
                    <div className="absolute top-28 left-1/2 -translate-x-1/2 max-w-xl w-full">
                        <div className="bg-[#1c1917] border-y-2 border-[#b45309] p-4 shadow-2xl flex items-center gap-6 animate-bounce-in relative">
                            {/* Decorative Brush Stroke */}
                            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-[#b91c1c]"></div>
                            
                            <div className="w-12 h-12 flex items-center justify-center text-2xl bg-[#292524] rounded-full border border-[#44403c] shadow-inner">👹</div>
                            <div className="flex-1">
                                <div className="text-[10px] text-[#d97706] font-bold tracking-[0.2em] mb-1 uppercase">The Shogun Speaks</div>
                                <div className="text-lg font-medium text-[#f5f5f4] font-serif italic">"{aiCommentary}"</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Right Leaderboard */}
                <div className="absolute top-4 right-4 w-60 bg-[#1c1917]/90 border border-[#44403c] p-0 shadow-xl">
                    <div className="bg-[#292524] px-4 py-2 border-b border-[#44403c] flex justify-between items-center">
                        <span className="text-xs text-[#d97706] uppercase tracking-[0.2em] font-bold">Warlords</span>
                        <span className="text-[10px] text-[#78716c]">Net Worth</span>
                    </div>
                    <div className="flex flex-col">
                        {gameState?.leaderboard.map((p, i) => (
                            <div key={p.id} className={`flex justify-between px-4 py-1.5 border-b border-[#292524] ${p.name === config.playerName ? 'bg-[#b91c1c]/20' : ''}`}>
                                <span className={`text-sm ${p.name === config.playerName ? 'text-[#fca5a5] font-bold' : 'text-[#a8a29e]'} truncate max-w-[120px]`}>
                                    {i+1}. {p.name}
                                </span>
                                <span className="font-mono text-xs text-[#d6d3d1]">${Math.floor(p.score)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom HUD */}
                <div className="flex justify-between items-end w-full">
                     <div className="text-xs text-[#a8a29e] font-serif flex gap-4 uppercase tracking-widest bg-[#000000]/50 px-4 py-2">
                         <span>Zone Closing</span>
                     </div>

                     {/* Minimap - Japanese Style */}
                     <div className="relative w-40 h-40 bg-[#1c1917] border-2 border-[#57534e] overflow-hidden mb-2 mr-2 shadow-2xl">
                         <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#44403c 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                         {gameState && (
                             <>
                                {/* Safe Zone */}
                                <div 
                                    className="absolute border border-[#b91c1c] rounded-full bg-[#b91c1c]/10 transition-all duration-100 shadow-[0_0_10px_rgba(185,28,28,0.4)]"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        width: `${(gameState.safeZoneSize / gameState.mapSize) * 100}%`,
                                        height: `${(gameState.safeZoneSize / gameState.mapSize) * 100}%`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                />

                                {Array.from(gameState.snakes.values()).map((s: Snake) => {
                                    if (s.isDead) return null;
                                    const isMe = s.id === 'player-1';
                                    const x = (s.segments[0].x / gameState.mapSize) * 100;
                                    const y = (s.segments[0].y / gameState.mapSize) * 100;
                                    return (
                                        <div 
                                            key={s.id}
                                            className={`absolute rounded-sm rotate-45 ${isMe ? 'bg-white z-10 w-2 h-2 animate-pulse border border-black' : 'bg-[#10b981] w-1 h-1'}`}
                                            style={{ left: `${x}%`, top: `${y}%` }}
                                        />
                                    )
                                })}
                             </>
                         )}
                     </div>
                </div>
            </div>

            {/* Game Over / Victory Overlay */}
            {(gameState?.status === 'GAME_OVER' || gameState?.status === 'VICTORY') && (
                <div className="absolute inset-0 bg-[#0c0a09]/95 flex flex-col items-center justify-center z-50 animate-fade-in bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]">
                    
                    <div className="border-y-4 border-[#b91c1c] py-12 w-full flex flex-col items-center bg-[#000000]/50 backdrop-blur-sm">
                        <h1 className={`${gameState.status === 'GAME_OVER' && gameState.playerStats.rank > 3 ? 'text-5xl md:text-6xl text-[#991b1b]' : 'text-8xl text-[#d97706]'} font-['Zen_Tokyo_Zoo'] tracking-widest mb-4 text-center max-w-5xl leading-tight drop-shadow-lg`}>
                            {gameState.status === 'VICTORY' ? 'SHOGUN' : (gameState.playerStats.rank > 3 ? 'DISHONORED' : 'ELIMINATED')}
                        </h1>
                        <div className="text-2xl font-serif text-[#d6d3d1] mb-8 tracking-[0.2em] uppercase">
                            Rank: <span className="text-[#fcd34d] text-4xl mx-2">#{gameState.playerStats.rank}</span> / {gameState.totalPlayers}
                        </div>
                        
                        {/* Payout Scroll */}
                        <div className="bg-[#f5f5f4] text-[#1c1917] p-8 max-w-2xl w-full mb-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                             {/* Paper texture feel */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none"></div>
                            
                            <div className="relative z-10">
                                <div className="text-center border-b-2 border-[#1c1917] pb-4 mb-6">
                                    <h3 className="text-xl font-bold uppercase tracking-widest">The Victor's Ledger</h3>
                                </div>
                                
                                <div className="space-y-3 mb-8">
                                    {/* Only show rows for Top 3 placements */}
                                    {gameState.eliminatedSnakes
                                        .filter(s => s.placement <= 3)
                                        .sort((a,b) => a.placement - b.placement)
                                        .map((s) => {
                                            const amount = Math.floor(s.finalScore);
                                            return (
                                                <div key={s.id} className="flex justify-between items-center text-sm border-b border-[#d6d3d4] pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold w-6 ${s.placement === 1 ? 'text-[#b45309]' : 'text-[#57534e]'}`}>
                                                            {s.placement === 1 ? '壱' : (s.placement === 2 ? '弐' : '参')}
                                                        </span>
                                                        <span className="font-bold">{s.name} {s.id === 'player-1' && '(YOU)'}</span>
                                                    </div>
                                                    <div className="font-mono font-bold text-[#15803d]">
                                                        +${amount}
                                                    </div>
                                                </div>
                                            )
                                    })}
                                    {gameState.eliminatedSnakes.filter(s => s.placement <= 3).length === 0 && (
                                        <div className="text-center text-[#78716c] py-4 italic">
                                            The battle still rages...
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t-2 border-[#1c1917]">
                                    <span className="font-bold uppercase tracking-widest text-[#44403c]">{gameState.playerStats.payout > 0 ? 'Tribute Gained' : 'Tribute Lost'}</span>
                                    <span className={`font-mono text-4xl font-bold ${gameState.playerStats.payout > 0 ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                                        {gameState.playerStats.payout > 0 ? '+' : '-'}${gameState.playerStats.payout > 0 ? gameState.playerStats.payout : gameState.entryFee}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={handleExit} 
                                className="bg-[#b91c1c] text-white hover:bg-[#991b1b] border-2 border-[#7f1d1d] px-12 py-4 font-bold text-xl tracking-[0.2em] shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0"
                            >
                                RETURN TO DOJO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
      ) : (
        /* MAIN MENU - SAMURAI THEME */
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {/* Background Image with Samurai/Japanese Architecture Theme */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542931287-023b922fa899?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center filter brightness-50 contrast-125 sepia-[0.3]"></div>
            
            {/* Overlay Gradient & Texture */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-transparent to-[#0c0a09]/80"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            
            <div className="relative z-10 flex flex-col items-center w-full max-w-6xl px-8 h-[90vh]">
                
                {/* Header */}
                <div className="text-center mb-12 relative group">
                    <div className="absolute -inset-10 bg-black/60 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <h1 className="text-9xl font-['Zen_Tokyo_Zoo'] text-[#f5f5f4] tracking-wider mb-2 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] relative z-10">
                        KUDOKU
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-[#d97706]">
                        <div className="h-[1px] w-12 bg-[#d97706]"></div>
                        <p className="text-lg tracking-[0.4em] font-serif uppercase text-[#d97706] drop-shadow-md">The Ronin's Gamble</p>
                        <div className="h-[1px] w-12 bg-[#d97706]"></div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full h-full max-h-[600px] items-stretch">
                    
                    {/* Left Panel: Armory (Skins) */}
                    <div className="md:col-span-3 flex flex-col bg-[#1c1917]/90 border-2 border-[#44403c] relative shadow-2xl overflow-hidden group">
                        {/* Architectural details */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-[#292524] border-b border-[#57534e]"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#292524] border-t border-[#57534e]"></div>
                        
                        <div className="p-4 border-b border-[#44403c] bg-[#292524] text-center">
                            <h2 className="text-[#a8a29e] tracking-[0.2em] text-xs uppercase font-bold">Armory</h2>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center relative p-6">
                            {/* Decorative background circle */}
                            <div className="absolute w-48 h-48 border border-[#44403c] rotate-45 opacity-20"></div>
                            <div className="absolute w-48 h-48 border border-[#44403c] opacity-20"></div>

                            <div 
                                className="w-40 h-40 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.8)] mb-8 border-4 border-[#292524] relative z-10 transition-transform duration-500 group-hover:scale-105" 
                                style={{ background: currentSkin.color, boxShadow: `0 0 40px ${currentSkin.color}40` }}
                            >
                                 <div className="absolute inset-0 rounded-full border border-white/10 opacity-50"></div>
                                 {/* Shine effect */}
                                 <div className="absolute top-4 left-4 w-12 h-6 bg-white/20 rounded-full rotate-[-45deg] blur-sm"></div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-[#e7e5e4] mb-2 font-serif">{currentSkin.name}</h3>
                            
                            {!ownedSkins.includes(currentSkin.id) ? (
                                 <span className="text-[#f87171] font-mono text-xs border border-[#7f1d1d] bg-[#450a0a] px-3 py-1 uppercase tracking-widest">Locked</span>
                            ) : (
                                 <span className="text-[#4ade80] font-mono text-xs border border-[#14532d] bg-[#052e16] px-3 py-1 uppercase tracking-widest">Owned</span>
                            )}

                            <div className="flex items-center gap-6 mt-8 z-10">
                                <button onClick={() => cycleSkin(-1)} className="w-10 h-10 border border-[#57534e] hover:bg-[#44403c] hover:text-[#f5f5f4] text-[#a8a29e] flex items-center justify-center transition-colors">←</button>
                                <span className="text-xs text-[#57534e] uppercase tracking-widest">{skinIndex + 1} / {SKINS.length}</span>
                                <button onClick={() => cycleSkin(1)} className="w-10 h-10 border border-[#57534e] hover:bg-[#44403c] hover:text-[#f5f5f4] text-[#a8a29e] flex items-center justify-center transition-colors">→</button>
                            </div>
                        </div>
                    </div>

                    {/* Center Panel: Dojo (Controls) */}
                    <div className="md:col-span-6 flex flex-col items-center justify-center relative z-20">
                        {/* Paper Scroll Background for Center */}
                        <div className="absolute inset-0 bg-[#e7e5e4] transform rotate-1 shadow-[0_0_100px_rgba(0,0,0,0.9)] border-y-8 border-[#292524]">
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] opacity-60"></div>
                           <div className="absolute inset-0 border-x border-[#d6d3d1] mx-4"></div>
                        </div>

                        <div className="relative z-10 w-full px-12 py-8 flex flex-col items-center h-full justify-between text-[#1c1917]">
                            
                            <div className="w-full text-center border-b-2 border-[#1c1917]/10 pb-6">
                                <div className="text-xs font-bold text-[#78716c] uppercase tracking-[0.3em] mb-2">Current Treasury</div>
                                <div className="text-5xl font-mono font-bold text-[#1c1917] tracking-tight">${balance}</div>
                            </div>

                            <div className="w-full">
                                <label className="block text-center text-xs font-bold text-[#57534e] uppercase tracking-[0.3em] mb-6">Select Tribute</label>
                                <div className="flex justify-center gap-4">
                                    {[10, 50, 100].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setEntryFee(amt)}
                                            className={`w-24 h-24 flex flex-col items-center justify-center border-2 transition-all transform hover:-translate-y-1 duration-300 ${
                                                entryFee === amt 
                                                ? 'bg-[#b91c1c] border-[#7f1d1d] text-[#f5f5f4] shadow-[0_10px_20px_rgba(185,28,28,0.3)]' 
                                                : 'bg-[#f5f5f4] border-[#d6d3d1] text-[#78716c] hover:border-[#a8a29e]'
                                            }`}
                                        >
                                            <span className="text-xs uppercase tracking-widest mb-1 opacity-70">Gold</span>
                                            <span className="text-2xl font-bold font-mono">${amt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full bg-[#1c1917]/5 p-4 border border-[#1c1917]/10 text-center">
                                <div className="text-sm font-serif italic text-[#44403c] mb-1">"The winner takes the spoils."</div>
                                <div className="text-xs uppercase tracking-widest text-[#78716c]">
                                    Pot Estimate: <span className="font-bold text-[#b45309]">${prizePool}</span>
                                </div>
                            </div>

                            <button 
                                onClick={startGame}
                                disabled={!!walletAddress && !ownedSkins.includes(config.selectedSkinId)}
                                className={`w-full py-5 text-xl font-bold uppercase tracking-[0.3em] transition-all relative overflow-hidden group border-2
                                    ${!walletAddress 
                                        ? 'bg-[#1c1917] text-[#d97706] border-[#d97706] hover:bg-[#d97706] hover:text-[#fffbeb] hover:shadow-[0_0_30px_rgba(217,119,6,0.4)]' 
                                        : (
                                        balance >= entryFee 
                                        ? 'bg-[#1c1917] text-[#f5f5f4] border-[#1c1917] hover:bg-[#b91c1c] hover:border-[#b91c1c] hover:shadow-[0_0_30px_rgba(185,28,28,0.5)]' 
                                        : 'bg-transparent text-[#b91c1c] border-[#b91c1c] cursor-not-allowed opacity-50'
                                    )}`}
                            >
                                <span className="relative z-10">
                                    {!walletAddress ? 'Link Spirit Wallet' : (balance >= entryFee ? 'Enter The Arena' : 'Insufficient Funds')}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Market (Merchant) */}
                    <div className="md:col-span-3 flex flex-col gap-4">
                         {/* Winner Stats - Wooden Tag Style */}
                         <div className="flex-1 bg-[#1c1917] border-l-4 border-[#d97706] p-6 flex flex-col items-start justify-center relative shadow-xl overflow-hidden">
                             <div className="absolute right-[-20px] top-[-20px] text-[100px] text-[#ffffff] opacity-5 font-serif font-black">壱</div>
                             <h3 className="text-[#a8a29e] font-bold text-xs uppercase tracking-[0.2em] mb-4">Reigning Shogun</h3>
                             <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-[#d97706] border-2 border-[#fffbeb]"></div>
                                <div className="text-[#f5f5f4] font-bold font-serif text-lg">Satoshi_N</div>
                             </div>
                             <div className="text-[#d97706] font-mono text-sm bg-[#451a03] px-2 py-1 border border-[#92400e]">
                                Bounty: $4,200
                             </div>
                         </div>

                         <button 
                            onClick={() => setIsMarketplaceOpen(true)}
                            className="flex-1 bg-[url('https://images.unsplash.com/photo-1618265376085-d0796c979d11?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center border-2 border-[#44403c] relative group overflow-hidden shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-[#0c0a09]/80 group-hover:bg-[#0c0a09]/60 transition-all duration-500"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-center">
                                <span className="text-4xl mb-3 text-[#e7e5e4] group-hover:scale-110 transition-transform duration-300">⚔️</span>
                                <span className="font-['Zen_Tokyo_Zoo'] text-2xl text-[#f5f5f4] tracking-widest mb-1">MERCHANT</span>
                                <span className="text-[10px] text-[#a8a29e] uppercase tracking-widest border-t border-[#a8a29e]/30 pt-2 w-full">Acquire Skins</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
