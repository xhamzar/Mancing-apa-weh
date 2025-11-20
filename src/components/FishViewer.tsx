
import React, { useEffect, useState } from 'react';
import { FishType } from '../types';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface FishViewerProps {
  fishType: FishType;
  onClose: () => void;
}

const FishViewer: React.FC<FishViewerProps> = ({ fishType, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Simulate loading delay for aesthetic purposes and to allow 3D scene to prep
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 800);

    // Basic validation
    if (!fishType || !fishType.id) {
        setHasError(true);
        setIsLoading(false);
    }

    return () => clearTimeout(timer);
  }, [fishType]);

  // Visual Rarity Logic
  const rarityLabel = fishType.difficulty > 8 ? 'MYTHICAL' : fishType.difficulty > 6 ? 'LEGENDARY' : fishType.difficulty > 3 ? 'RARE' : 'COMMON';
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
      {/* Overlay Background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s]" onClick={onClose}></div>

      <div className="relative w-full max-w-md flex flex-col items-center z-10 pointer-events-none">
        
        {/* Title Header */}
        <div className="bg-slate-900/90 backdrop-blur border border-white/10 px-8 py-4 rounded-full mb-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-all animate-[slideDown_0.3s]">
            <h2 className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] flex items-center gap-3 uppercase tracking-wider">
                <Sparkles size={24} style={{ color: fishType.color }} />
                {fishType.name}
            </h2>
        </div>

        {/* 3D AREA / LOADING STATE */}
        <div className="w-full h-[300px] flex items-center justify-center relative">
             
             {/* Loading Spinner */}
             {isLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 z-20 bg-black/20 rounded-xl backdrop-blur-sm">
                     <Loader2 size={48} className="animate-spin text-blue-400 mb-2" />
                     <span className="text-sm font-bold tracking-widest uppercase">Generating 3D Model...</span>
                 </div>
             )}

             {/* Error State */}
             {hasError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 z-20 bg-black/40 rounded-xl backdrop-blur-sm border border-red-500/30">
                     <AlertCircle size={48} className="mb-2" />
                     <span className="text-sm font-bold tracking-widest uppercase">Model Load Failed</span>
                     <span className="text-xs text-red-300 mt-1">Data corrupted or missing</span>
                 </div>
             )}

             {/* Hint text (Only show when loaded and no error) */}
             {!isLoading && !hasError && (
                <div className="absolute bottom-4 text-white/20 text-xs font-mono uppercase tracking-[0.2em] animate-pulse">
                    3D Preview Mode
                </div>
             )}
        </div>

        {/* Stats Card */}
        <div className="bg-slate-900/95 backdrop-blur-md w-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl pointer-events-auto animate-[slideUp_0.3s]">
            <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="p-4 text-center">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Rarity</div>
                    <div className="text-xl font-black" style={{ color: fishType.color }}>{rarityLabel}</div>
                </div>
                <div className="p-4 text-center">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Est. Value</div>
                    <div className="text-xl font-black text-green-400">~{Math.floor(fishType.base * 1.2)} G</div>
                </div>
            </div>
            
            <div className="bg-black/20 p-4 text-center border-t border-white/5">
                 <p className="text-sm text-slate-300 italic">
                    "{fishType.displayName} found in the deep waters."
                 </p>
            </div>

            <button 
                onClick={onClose}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest transition-colors"
            >
                Close Viewer
            </button>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default FishViewer;
