import React, { useState } from 'react';
import { 
  CommunityNeed, 
  Category 
} from '../types/resource';
import { 
  AlertCircle, 
  Sparkles, 
  PlusCircle, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Heart, 
  ShieldCheck, 
  ChevronRight,
  Send,
  X
} from 'lucide-react';
import { NEIGHBORHOODS } from '../data/neighborhoods';

interface CommunityNeedsBoardProps {
  needs: CommunityNeed[];
  onFulfillNeed: (need: CommunityNeed) => void;
  onNeedCreated: (newNeed: CommunityNeed) => void;
}

export const CommunityNeedsBoard: React.FC<CommunityNeedsBoardProps> = ({
  needs,
  onFulfillNeed,
  onNeedCreated
}) => {
  const [isPostNeedModalOpen, setIsPostNeedModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState<'critical' | 'urgent' | 'moderate'>('urgent');
  const [neighborhoodId, setNeighborhoodId] = useState('mission');
  const [requesterType, setRequesterType] = useState<CommunityNeed['requesterType']>('Community Pantry Steward');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !quantity.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          quantityRequested: quantity.trim(),
          urgency,
          neighborhoodId,
          requesterType,
          reason: reason.trim() || 'Urgent neighborhood mutual aid need.'
        })
      });

      if (res.ok) {
        const created: CommunityNeed = await res.json();
        onNeedCreated(created);
        setIsPostNeedModalOpen(false);
        setTitle('');
        setQuantity('');
        setReason('');
      }
    } catch (err) {
      console.error('Failed to post need:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNeeds = needs.filter(n => n.status === 'open');

  return (
    <div id="community-needs-board" className="bg-gradient-to-br from-rose-950/20 via-amber-950/10 to-emerald-950/20 rounded-3xl p-5 sm:p-6 border border-rose-200/40 shadow-sm space-y-4 scroll-mt-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Urgent Community Wishlist & Acute Needs
              </h2>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                {openNeeds.length} Urgent Calls
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Grassroots community pantries, shelter workers, and neighbors in immediate hardship
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPostNeedModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition-colors self-end sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Post an Urgent Community Need</span>
        </button>
      </div>

      {/* Needs Cards Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {openNeeds.slice(0, 4).map((need) => {
          const isCritical = need.urgency === 'critical';

          return (
            <div
              key={need.id}
              className={`bg-white rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between shadow-xs ${
                isCritical
                  ? 'border-rose-300 ring-1 ring-rose-200 hover:border-rose-400'
                  : 'border-amber-200/80 hover:border-amber-300'
              }`}
            >
              <div>
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isCritical
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {isCritical ? '🚨 Critical Need' : '⚡ Urgent Need'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {need.neighborhoodName}
                  </span>
                </div>

                {/* Need Title */}
                <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1">
                  {need.title}
                </h3>

                {/* Quantity */}
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mb-2">
                  Needed: {need.quantityRequested}
                </div>

                {/* Reason / Context */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  "{need.reason}"
                </p>

                <div className="text-[10px] text-slate-500 font-medium">
                  Requested by: <strong>{need.requesterType}</strong>
                </div>
              </div>

              {/* Fulfill Action */}
              <div className="pt-3 mt-2 border-t border-slate-100">
                <button
                  onClick={() => onFulfillNeed(need)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>I Can Donate This</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Post Need Modal */}
      {isPostNeedModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white p-5 flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Post an Urgent Community Need</h3>
                  <p className="text-xs text-rose-200">
                    Broadcast directly to compassionate local donors
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPostNeedModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitNeed} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What item is acutely needed?
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Diapers Size 4, Warm Thermal Coats, Fresh Milk for Fridge..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Food">Food</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Hygiene">Hygiene</option>
                    <option value="Household">Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Quantity Needed
                  </label>
                  <input
                    type="text"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 3-5 coats, 2 packs"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Neighborhood
                  </label>
                  <select
                    value={neighborhoodId}
                    onChange={(e) => setNeighborhoodId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  >
                    {NEIGHBORHOODS.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-rose-700 focus:outline-none"
                  >
                    <option value="critical">Critical (Immediate / Tonight)</option>
                    <option value="urgent">Urgent (Next 24 Hours)</option>
                    <option value="moderate">Moderate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Requester Type
                </label>
                <select
                  value={requesterType}
                  onChange={(e) => setRequesterType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                >
                  <option value="Community Pantry Steward">Community Pantry Steward</option>
                  <option value="Outreach Volunteer">Outreach Volunteer / Street Medic</option>
                  <option value="Local Family">Local Family in Need</option>
                  <option value="Senior Center">Senior Center / Elder Care</option>
                  <option value="Neighbor">Neighbor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Context / Why is this urgently needed?
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Freezing night coming up; pantry ran dry after morning rush; single parent in transition..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPostNeedModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Broadcasting...' : 'Publish Urgent Need'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
