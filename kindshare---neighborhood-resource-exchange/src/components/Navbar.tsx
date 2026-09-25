import React from 'react';
import { 
  HeartHandshake, 
  Map as MapIcon, 
  LayoutGrid, 
  PlusCircle, 
  ShieldCheck, 
  MapPin
} from 'lucide-react';
import { NEIGHBORHOODS } from '../data/neighborhoods';

interface NavbarProps {
  currentView: 'map' | 'marketplace';
  onViewChange: (view: 'map' | 'marketplace') => void;
  selectedNeighborhood: string;
  onNeighborhoodChange: (id: string) => void;
  onOpenUpload: () => void;
  onOpenSafety: () => void;
  activeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  selectedNeighborhood,
  onNeighborhoodChange,
  onOpenUpload,
  onOpenSafety,
  activeCount
}) => {
  return (
    <header className="sticky top-0 z-30 bg-emerald-950/95 backdrop-blur-md border-b border-emerald-800/60 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Mission */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-emerald-950 font-bold">
              <HeartHandshake className="w-6 h-6 text-emerald-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">KindShare</span>
              </div>
              <p className="text-xs text-emerald-200/70 hidden sm:block">
                Neighborhood Mutual Aid & Resource Exchange
              </p>
            </div>
          </div>

          {/* Center: View Switcher (Map vs Marketplace) */}
          <div className="flex items-center bg-emerald-900/80 p-1 rounded-xl border border-emerald-700/60 shadow-inner">
            <button
              onClick={() => onViewChange('marketplace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'marketplace'
                  ? 'bg-emerald-500 text-emerald-950 shadow-sm font-semibold'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Marketplace</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                currentView === 'marketplace' ? 'bg-emerald-950/20 text-emerald-950' : 'bg-emerald-800 text-emerald-200'
              }`}>
                {activeCount}
              </span>
            </button>
            <button
              onClick={() => onViewChange('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'map'
                  ? 'bg-emerald-500 text-emerald-950 shadow-sm font-semibold'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Neighborhood quick selector */}
            <div className="hidden md:flex items-center gap-1 bg-emerald-900/60 border border-emerald-700/50 rounded-xl px-2.5 py-1.5 text-xs text-emerald-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedNeighborhood}
                onChange={(e) => onNeighborhoodChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-emerald-900 text-white">All San Francisco</option>
                {NEIGHBORHOODS.map(n => (
                  <option key={n.id} value={n.id} className="bg-emerald-900 text-white">
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Safety & Guide */}
            <button
              onClick={onOpenSafety}
              title="Public Handoffs & Safety Guide"
              className="p-2 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 hover:text-white hover:bg-emerald-800/60 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Give Item */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-amber-500/25 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Give Item</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
