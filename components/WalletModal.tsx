
import React from 'react';

interface WalletModalProps {
  onConnect: () => void;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ onConnect, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/90">
      <div className="w-96 border border-neutral-800 bg-black p-8">
        <h2 className="text-sm text-neutral-500 mb-8 tracking-widest uppercase">Select Provider</h2>
        
        <div className="space-y-4">
          {['METAMASK', 'PHANTOM', 'COINBASE'].map((wallet) => (
            <button 
              key={wallet}
              onClick={onConnect}
              className="w-full border border-neutral-800 py-4 text-sm hover:bg-white hover:text-black transition-colors text-left px-6"
            >
              {wallet}
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full text-neutral-600 hover:text-white text-xs"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
};

export default WalletModal;
