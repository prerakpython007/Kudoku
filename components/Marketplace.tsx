

import React from 'react';
import { Skin } from '../types';
import { SKINS } from '../constants';

interface MarketplaceProps {
  balance: number;
  currentSkinId: string;
  ownedSkins: string[];
  onPurchase: (skin: Skin) => void;
  onEquip: (skin: Skin) => void;
  onClose: () => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ 
  balance, currentSkinId, ownedSkins, onPurchase, onEquip, onClose 
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/95">
      <div className="w-full max-w-4xl h-[80vh] flex flex-col border border-neutral-800">
        
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
          <h2 className="text-xl font-light tracking-widest">ASSET STORE</h2>
          <div className="text-emerald-500 font-mono">${balance}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-8">
          {SKINS.map(skin => {
            const isOwned = ownedSkins.includes(skin.id);
            const isEquipped = currentSkinId === skin.id;

            return (
              <div key={skin.id} className="border border-neutral-800 p-6 hover:border-neutral-600 transition-colors">
                <div className="flex justify-between mb-6">
                    <span className="text-sm tracking-widest">{skin.name}</span>
                    <div 
                        className="w-4 h-4 rounded-full" 
                        style={{background: skin.color}}
                    />
                </div>
                
                <div className="flex gap-4 items-center">
                     {isOwned ? (
                        <button 
                            onClick={() => onEquip(skin)}
                            disabled={isEquipped}
                            className={`flex-1 py-3 text-xs font-bold border ${isEquipped ? 'bg-white text-black border-white' : 'border-neutral-700 hover:border-white'}`}
                        >
                            {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                        </button>
                     ) : (
                        <button className="flex-1 py-3 text-xs font-bold border border-neutral-700 hover:border-white">
                            BUY ${skin.price}
                        </button>
                     )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-6 border-t border-neutral-800 text-right">
           <button onClick={onClose} className="text-neutral-500 hover:text-white text-xs tracking-widest uppercase">Close Terminal</button>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;