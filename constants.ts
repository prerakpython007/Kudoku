
import { Skin } from './types';

// World
export const MAP_SIZE = 4000;
export const GRID_SIZE = 80;

// Physics
export const BASE_SPEED = 3.5; 
export const BOOST_SPEED = 7.5;
export const TURN_SPEED = 0.1; 
export const SEGMENT_SPACING = 5; 
export const INITIAL_LENGTH = 20; 
export const SNAKE_WIDTH = 24;
export const BOOST_COST_PER_TICK = 0.3; 

// Visuals
export const PARTICLE_COUNT_ON_DEATH = 12; // Reduced from 25 for performance
export const ZOOM_DEFAULT = 0.85;
export const ZOOM_MIN = 0.4;

// Colors
export const COLOR_BG = '#0f172a'; // Slate 900
export const COLOR_GRID = '#1e293b'; // Slate 800
export const COLOR_BORDER = '#334155';

export const SKINS: Skin[] = [
  // --- TIER 1: STARTERS ---
  {
    id: 'blue',
    name: 'Ethereum Blue',
    color: '#2563eb', // Blue 600
    detailColor: '#60a5fa', // Blue 400
    price: 0
  },
  {
    id: 'mint',
    name: 'Fresh Mint',
    color: '#059669', // Emerald 600
    detailColor: '#6ee7b7', // Emerald 300
    price: 50
  },
  {
    id: 'gray',
    name: 'Stablecoin Gray',
    color: '#475569', // Slate 600
    detailColor: '#94a3b8', // Slate 400
    price: 50
  },

  // --- TIER 2: TRADERS ---
  {
    id: 'red',
    name: 'Bear Market Red',
    color: '#dc2626', // Red 600
    detailColor: '#fca5a5', // Red 300
    price: 150
  },
  {
    id: 'green',
    name: 'Bull Run Green',
    color: '#16a34a', // Green 600
    detailColor: '#4ade80', // Green 400
    price: 150
  },
  {
    id: 'xrp',
    name: 'Ripple Blue',
    color: '#00aae4', // Cyan Blue
    detailColor: '#e0f2fe', // Light Cyan
    price: 200
  },
  {
    id: 'purple',
    name: 'Solana Purple',
    color: '#7c3aed', // Violet 600
    detailColor: '#c4b5fd', // Violet 300
    price: 250
  },
  {
    id: 'avax',
    name: 'Avalanche Red',
    color: '#e84142', // Vivid Red
    detailColor: '#fecaca', // Light Red
    price: 300
  },
  {
    id: 'orange',
    name: 'Bitcoin Orange',
    color: '#ea580c', // Orange 600
    detailColor: '#fbbf24', // Amber 400
    price: 350
  },
  {
    id: 'atom',
    name: 'Cosmos Stardust',
    color: '#2e3148', // Dark Slate Blue
    detailColor: '#a4adff', // Starry Blue
    price: 400
  },
  {
    id: 'shib',
    name: 'Shiba Army',
    color: '#fca311', // Golden Yellow
    detailColor: '#fffbeb', // Off White
    price: 450
  },

  // --- TIER 3: DEGENS ---
  {
    id: 'pink',
    name: 'Uniswap Pink',
    color: '#db2777', // Pink 600
    detailColor: '#f9a8d4', // Pink 300
    price: 500
  },
  {
    id: 'teal',
    name: 'Arbitrum Teal',
    color: '#0d9488', // Teal 600
    detailColor: '#2dd4bf', // Teal 400
    price: 500
  },
  {
    id: 'xmr',
    name: 'Privacy Protocol',
    color: '#ff6600', // Deep Orange
    detailColor: '#404040', // Privacy Dark Grey
    price: 550
  },
  {
    id: 'yellow',
    name: 'Dogecoin Gold',
    color: '#ca8a04', // Yellow 600
    detailColor: '#fef08a', // Yellow 200
    price: 600
  },
  {
    id: 'defi',
    name: 'Yield Farmer',
    color: '#8b5cf6', // Purple
    detailColor: '#10b981', // Emerald Green (Money)
    price: 700
  },
  {
    id: 'gas',
    name: 'Gas Guzzler',
    color: '#451a03', // Oil Brown
    detailColor: '#f59e0b', // Fire Amber
    price: 800
  },
  {
    id: 'vapor',
    name: 'Vaporware',
    color: '#c084fc', // Bright Purple
    detailColor: '#22d3ee', // Cyan
    price: 900
  },

  // --- TIER 4: HIGH ROLLERS ---
  {
    id: 'cyber',
    name: 'Metaverse Neon',
    color: '#4c1d95', // Violet 900
    detailColor: '#22d3ee', // Cyan 400
    price: 1000
  },
  {
    id: 'contract',
    name: 'Smart Contract',
    color: '#2563eb', // Royal Blue
    detailColor: '#fbbf24', // Gold Circuitry
    price: 1100
  },
  {
    id: 'ice',
    name: 'Cold Storage',
    color: '#0284c7', // Sky 600
    detailColor: '#e0f2fe', // Sky 100
    price: 1200
  },
  {
    id: 'magma',
    name: 'Liquidator Magma',
    color: '#7f1d1d', // Red 900
    detailColor: '#fb923c', // Orange 400
    price: 1500
  },
  {
    id: 'matrix',
    name: 'The Developer',
    color: '#022c22', // Teal 950
    detailColor: '#4ade80', // Green 400
    price: 1800
  },
  {
    id: 'ico',
    name: 'Golden ICO',
    color: '#be185d', // Deep Pink
    detailColor: '#facc15', // Gold
    price: 2500
  },

  // --- TIER 5: WHALES (Luxury) ---
  {
    id: 'gold',
    name: 'The Whale',
    color: '#b45309', // Amber 700
    detailColor: '#fcd34d', // Amber 300 (Shiny Gold)
    price: 3000
  },
  {
    id: 'obsidian',
    name: 'Black Market',
    color: '#000000', // Black
    detailColor: '#38bdf8', // Sky 400 (Tron Lines)
    price: 4000
  },
  {
    id: 'pearl',
    name: 'White Paper',
    color: '#e2e8f0', // Slate 200
    detailColor: '#ffffff', // White
    price: 5000
  },
  {
    id: 'void',
    name: 'Darkpool Void',
    color: '#0f172a', // Slate 900 (Camouflage)
    detailColor: '#6366f1', // Indigo 500
    price: 7500
  }
];

export const BOT_NAMES = [
  "Satoshi", "Vitalik", "HODLer", "DiamondHands", "ToTheMoon",
  "WhaleAlert", "RugPull", "GasFees", "Altcoin", "DeFi_King",
  "PaperHands", "WAGMI", "DoKwon", "SBF_Jail", "Pepe",
  "Doge", "Shiba", "Elon", "Web3_Guru", "NFT_Flipper",
  "YieldFarmer", "Airdrop", "SeedPhrase", "ColdWallet", "Miner",
  "HashRate", "BlockReward", "SmartContract", "Oracle", "DAO_Vote"
];
