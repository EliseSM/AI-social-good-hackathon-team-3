import React from 'react';
import { CommunityFridgeStatus } from '../types/resource';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Thermometer, 
  PlusCircle, 
  CheckCircle2, 
  Sparkles, 
  Utensils 
} from 'lucide-react';

interface CommunityFridgesMonitorProps {
  fridges: CommunityFridgeStatus[];
  onRestockFridge: (fridge: CommunityFridgeStatus) => void;
}

export const CommunityFridgesMonitor: React.FC<CommunityFridgesMonitorProps> = ({
  fridges,
  onRestockFridge
}) => {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Verified Community Fridges & Free Pantries (Live)
              </h2>
              <span className="text-[10px] font-mono bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                24/7 Public Access
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Clean sanitary community refrigerators open 24/7 for zero-barrier food rescue
            </p>
          </div>
        </div>

        <div className="text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
          Temperature Monitored • Sanitized Daily
        </div>
      </div>

      {/* Fridges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fridges.map((fridge) => {
          const isLow = fridge.fullnessPercent < 35;
          const isHealthy = fridge.fullnessPercent >= 60;

          return (
            <div
              key={fridge.id}
              className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                isLow
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white'
              }`}
            >
              <div>
                {/* Top status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isLow 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-mono' 
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono'
                  }`}>
                    {fridge.fullnessPercent}% Full {isLow ? '(Needs Restock)' : '(Good Supply)'}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {fridge.lastRestockedAgo}
                  </span>
                </div>

                {/* Name & Address */}
                <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                  {fridge.name}
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{fridge.address} • {fridge.neighborhoodName}</span>
                </div>

                {/* Fullness Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLow ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${fridge.fullnessPercent}%` }}
                  />
                </div>

                {/* Urgent Needs Tags */}
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Most Needed Items:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {fridge.urgentNeeds.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        + {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium mb-3">
                  <Thermometer className="w-3.5 h-3.5 text-teal-600" />
                  <span>{fridge.temperatureStatus}</span>
                  <span className="text-slate-300">•</span>
                  <span>~{fridge.dailyPoundsDistributed} lbs shared/day</span>
                </div>
              </div>

              {/* Restock Button */}
              <button
                onClick={() => onRestockFridge(fridge)}
                className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Restock This Fridge (&lt;20s)</span>
              </button>

            </div>
          );
        })}
      </div>

    </div>
  );
};
