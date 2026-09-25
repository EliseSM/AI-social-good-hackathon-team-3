import React from 'react';
import { 
  Utensils, 
  TrendingUp, 
  Sparkles, 
  Leaf, 
  ShieldCheck, 
  Users, 
  Flame, 
  HeartHandshake 
} from 'lucide-react';
import { SocialImpactStats } from '../types/resource';

interface ImpactTickerProps {
  stats: SocialImpactStats;
}

export const ImpactTicker: React.FC<ImpactTickerProps> = ({ stats }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-b border-emerald-800/80 shadow-inner overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Impact Headline & Live Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
              Live Community Impact
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Hyper-local surplus diverted to immediate human dignity
            </span>
          </div>

          {/* Center: Stat Badges */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-full py-0.5 text-xs">
            
            {/* Meals Rescued */}
            <div className="flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-xl shrink-0">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-extrabold text-white font-mono">{stats.mealsRescued.toLocaleString()}</span>
              <span className="text-[11px] text-emerald-200">Meals Rescued</span>
            </div>

            {/* Pounds of Food Diverted */}
            <div className="flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-xl shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-extrabold text-white font-mono">{stats.poundsFoodDiverted.toLocaleString()}</span>
              <span className="text-[11px] text-emerald-200">lbs Food Diverted</span>
            </div>

            {/* Warmth & Shelter Items */}
            <div className="flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-xl shrink-0">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-extrabold text-white font-mono">{stats.warmthItemsDelivered}</span>
              <span className="text-[11px] text-emerald-200">Warmth Layers</span>
            </div>

            {/* Hygiene Kits */}
            <div className="flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-xl shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-extrabold text-white font-mono">{stats.hygieneKitsShared}</span>
              <span className="text-[11px] text-emerald-200">Hygiene Packs</span>
            </div>

            {/* CO2 Emissions Avoided */}
            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-900/60 border border-emerald-700/50 px-2.5 py-1 rounded-xl shrink-0">
              <Leaf className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-extrabold text-white font-mono">{stats.co2EmissionsSavedKg.toLocaleString()} kg</span>
              <span className="text-[11px] text-emerald-200">CO₂e Saved</span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
