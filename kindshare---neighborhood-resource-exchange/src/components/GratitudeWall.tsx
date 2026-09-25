import React, { useState } from 'react';
import { GratitudeStory } from '../types/resource';
import { 
  Heart, 
  HeartHandshake, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  PlusCircle, 
  MapPin, 
  X 
} from 'lucide-react';

interface GratitudeWallProps {
  stories: GratitudeStory[];
  onHeartStory: (storyId: string) => void;
  onStoryCreated: (newStory: GratitudeStory) => void;
}

export const GratitudeWall: React.FC<GratitudeWallProps> = ({
  stories,
  onHeartStory,
  onStoryCreated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authorRole, setAuthorRole] = useState<GratitudeStory['authorRole']>('Recipient');
  const [neighborhoodName, setNeighborhoodName] = useState('Mission District');
  const [itemName, setItemName] = useState('');
  const [message, setMessage] = useState('');
  const [tag, setTag] = useState('Dignified Mutual Aid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorRole,
          neighborhoodName,
          itemName: itemName.trim() || 'Community Surplus Item',
          message: message.trim(),
          tag
        })
      });

      if (res.ok) {
        const created: GratitudeStory = await res.json();
        onStoryCreated(created);
        setIsModalOpen(false);
        setMessage('');
        setItemName('');
      }
    } catch (err) {
      console.error('Failed to post gratitude:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Community Gratitude & Proof-of-Care Wall
              </h2>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Real Social Impact
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Heartfelt notes from neighbors, shelter volunteers, and families who received essential aid
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-xs transition-colors self-end sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Leave a Note of Gratitude</span>
        </button>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stories.map((story) => (
          <div
            key={story.id}
            className="bg-gradient-to-b from-emerald-50/40 to-slate-50/50 rounded-2xl p-4 border border-emerald-100/90 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            {/* Top Row: Tag & Location */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                  ✨ {story.tag}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  {story.neighborhoodName}
                </span>
              </div>

              {/* Item referenced */}
              <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                <span>Received:</span>
                <span className="text-emerald-700 underline decoration-emerald-300">{story.itemName}</span>
              </div>

              {/* Story text */}
              <p className="text-xs text-slate-700 leading-relaxed italic mb-3">
                "{story.message}"
              </p>
            </div>

            {/* Bottom Row: Author & Heart Action */}
            <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-500">
                — {story.authorRole}
              </span>

              <button
                onClick={() => onHeartStory(story.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-colors shadow-2xs active:scale-95"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span className="font-bold text-[11px] font-mono">{story.heartsCount}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Gratitude Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-2.5">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                <div>
                  <h3 className="font-extrabold text-base text-white">Leave an Anonymous Note of Thanks</h3>
                  <p className="text-xs text-emerald-200">Inspire your neighborhood with genuine community gratitude</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What item did you or your community receive?
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Winter Jacket, Fresh Fruit, Hygiene Kit..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Your Role
                  </label>
                  <select
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Recipient">Neighbor / Recipient</option>
                    <option value="Pantry Volunteer">Pantry Volunteer</option>
                    <option value="Community Member">Community Member</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Neighborhood
                  </label>
                  <input
                    type="text"
                    value={neighborhoodName}
                    onChange={(e) => setNeighborhoodName(e.target.value)}
                    placeholder="e.g. Mission, SOMA"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Gratitude Message
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How did this item help you or your family? How did the handoff feel?"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Posting...' : 'Share Gratitude'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
