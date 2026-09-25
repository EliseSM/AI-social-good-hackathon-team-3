import React from 'react';
import { 
  ResourceListing, 
  Category 
} from '../types/resource';
import { 
  Utensils, 
  Shirt, 
  Sparkles, 
  Home, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  Lock,
  Leaf,
  AlertCircle,
  Award
} from 'lucide-react';

interface ResourceCardProps {
  listing: ResourceListing;
  onClaim: (listing: ResourceListing) => void;
  onOpenHub?: (hubId: string) => void;
}

const CATEGORY_CONFIG: Record<Category, { color: string; badgeColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  Food: { 
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
    badgeColor: 'bg-emerald-600 text-white',
    icon: Utensils 
  },
  Clothing: { 
    color: 'bg-sky-50 text-sky-800 border-sky-200', 
    badgeColor: 'bg-sky-600 text-white',
    icon: Shirt 
  },
  Hygiene: { 
    color: 'bg-purple-50 text-purple-800 border-purple-200', 
    badgeColor: 'bg-purple-600 text-white',
    icon: Sparkles 
  },
  Household: { 
    color: 'bg-amber-50 text-amber-800 border-amber-200', 
    badgeColor: 'bg-amber-600 text-white',
    icon: Home 
  }
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ listing, onClaim }) => {
  const CatIcon = CATEGORY_CONFIG[listing.category]?.icon || Utensils;
  const isAvailable = listing.status === 'available';
  const isReserved = listing.status === 'reserved';
  const isClaimed = listing.status === 'claimed';
  const isCritical = listing.urgency === 'critical';

  const getRelativeTime = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className={`group bg-white rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
      isClaimed
        ? 'border-slate-200 opacity-60 bg-slate-50'
        : isReserved
        ? 'border-amber-300 shadow-sm ring-1 ring-amber-200'
        : isCritical
        ? 'border-rose-300 hover:border-rose-400 shadow-sm hover:shadow-md'
        : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
    }`}>
      
      {/* Top Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={listing.imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Gradient Overlay for high-contrast legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm border ${
              CATEGORY_CONFIG[listing.category]?.color || 'bg-white/90 text-slate-800'
            }`}>
              <CatIcon className="w-3.5 h-3.5" />
              {listing.category}
            </span>

            {/* Marketplace Pricing Tag: 100% Free / Mutual Aid */}
            <span className="bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              Free Gift
            </span>
          </div>

          {/* Availability badge */}
          {isAvailable && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Ready Now
            </span>
          )}
          {isReserved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
              Pending Pickup
            </span>
          )}
          {isClaimed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500 text-white shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
              Claimed
            </span>
          )}
        </div>

        {/* Bottom Image Overlay: Location & Time */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-1 bg-slate-950/70 backdrop-blur-md px-2.5 py-0.5 rounded-full font-medium border border-white/10">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span className="font-semibold">{listing.neighborhoodName}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-full font-mono text-[11px] text-slate-200">
            <Clock className="w-3 h-3 text-slate-300" />
            <span>{getRelativeTime(listing.createdAt)}</span>
          </div>
        </div>

      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Quantity & Condition Bar */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {listing.quantity}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Condition: <strong className="text-slate-700">{listing.condition}</strong>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors">
            {listing.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
            {listing.description}
          </p>

          {/* Palpable Social Impact Highlight */}
          {listing.impactMetric && (
            <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-2.5 py-1.5 flex items-center gap-2 mb-2.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-950 truncate">
                {listing.impactMetric}
              </span>
            </div>
          )}

          {/* Tags & Expiry */}
          <div className="flex flex-wrap gap-1">
            {listing.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {listing.expiryNotice && (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                <span>{listing.expiryNotice}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section: Safe Handoff Spot & Claim Action */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
          {/* Safe Handoff Hub */}
          <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-900 truncate">
                Pickup Hub: {listing.suggestedHub.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {listing.suggestedHub.address} • {listing.suggestedHub.openHours}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onClaim(listing)}
            disabled={isClaimed}
            className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isClaimed
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : isReserved
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20 hover:shadow-md'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {isClaimed
                ? 'Surplus Claimed'
                : isReserved
                ? 'View Active Handoff & Chat'
                : 'Claim Item / Pick Up'}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
