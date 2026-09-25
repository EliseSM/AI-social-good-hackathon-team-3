import React, { useState, useMemo } from 'react';
import { 
  ResourceListing, 
  Category, 
  CommunityNeed, 
  GratitudeStory, 
  CommunityFridgeStatus 
} from '../types/resource';
import { ResourceCard } from './ResourceCard';
import { CommunityNeedsBoard } from './CommunityNeedsBoard';
import { CommunityFridgesMonitor } from './CommunityFridgesMonitor';
import { GratitudeWall } from './GratitudeWall';
import { 
  Search, 
  Filter, 
  Utensils, 
  Shirt, 
  Sparkles, 
  Home, 
  Sparkle,
  PlusCircle,
  ShieldCheck,
  MapPin,
  Flame,
  AlertCircle,
  Heart,
  TrendingUp,
  LayoutGrid,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface MarketplaceViewProps {
  listings: ResourceListing[];
  needs: CommunityNeed[];
  stories: GratitudeStory[];
  fridges: CommunityFridgeStatus[];
  selectedNeighborhood: string;
  onNeighborhoodChange: (id: string) => void;
  onClaimItem: (listing: ResourceListing) => void;
  onOpenUpload: (targetNeed?: CommunityNeed) => void;
  onNeedCreated: (newNeed: CommunityNeed) => void;
  onStoryCreated: (newStory: GratitudeStory) => void;
  onHeartStory: (storyId: string) => void;
  onRestockFridge: (fridge: CommunityFridgeStatus) => void;
}

const CATEGORIES: { label: string; value: Category | 'All'; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'All Items', value: 'All', icon: Sparkle },
  { label: 'Rescued Food', value: 'Food', icon: Utensils },
  { label: 'Warmth & Clothes', value: 'Clothing', icon: Shirt },
  { label: 'Essential Hygiene', value: 'Hygiene', icon: Sparkles },
  { label: 'Household & Bedding', value: 'Household', icon: Home }
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  listings,
  needs,
  stories,
  fridges,
  selectedNeighborhood,
  onNeighborhoodChange,
  onClaimItem,
  onOpenUpload,
  onNeedCreated,
  onStoryCreated,
  onHeartStory,
  onRestockFridge
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'needs' | 'fridges' | 'stories'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved'>('available');
  const [sortBy, setSortBy] = useState<'urgent' | 'recent' | 'impact'>('urgent');

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      // Neighborhood filter
      if (selectedNeighborhood !== 'all' && item.neighborhoodId !== selectedNeighborhood) {
        return false;
      }
      // Status filter
      if (statusFilter === 'available' && item.status !== 'available') {
        return false;
      }
      if (statusFilter === 'reserved' && item.status !== 'reserved') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(q));
        const matchesNhood = item.neighborhoodName.toLowerCase().includes(q);
        const matchesImpact = item.impactMetric && item.impactMetric.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesNhood && !matchesImpact) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgent') {
        if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
        if (b.urgency === 'critical' && a.urgency !== 'critical') return 1;
        if (a.status === 'available' && b.status !== 'available') return -1;
        if (b.status === 'available' && a.status !== 'available') return 1;
      } else if (sortBy === 'impact') {
        return (b.co2SavedKg || 0) - (a.co2SavedKg || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [listings, selectedCategory, selectedNeighborhood, statusFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      
      {/* Marketplace Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-emerald-800/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="space-y-2 max-w-2xl relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Connecting Local Surplus With Community Need
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            Share extra groceries, warm clothing, and household goods with neighbors across San Francisco. Free, direct, and safe public pickups.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto relative z-10">
          <button
            onClick={() => onOpenUpload()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-sm shadow-md hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Donate Surplus</span>
          </button>
        </div>

      </div>

      {/* Urgent Community Wishlist Section */}
      <CommunityNeedsBoard
        needs={needs}
        onFulfillNeed={(need) => onOpenUpload(need)}
        onNeedCreated={onNeedCreated}
      />

      {/* Main Marketplace Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-2xl transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Active Surplus Feed</span>
          <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
            activeTab === 'all' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-700'
          }`}>
            {filteredListings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fridges')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-2xl transition-all ${
            activeTab === 'fridges'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Utensils className="w-4 h-4 text-teal-400" />
          <span>Community Fridges Live</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold">
            {fridges.length} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-2xl transition-all ${
            activeTab === 'stories'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
          <span>Community Gratitude & Stories</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-bold">
            {stories.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE MARKETPLACE FEED */}
      {activeTab === 'all' && (
        <div className="space-y-5">
          
          {/* Marketplace Search & Facet Filters */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            
            {/* Search Input Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search marketplace: bananas, bread, warm coat, diapers, blankets..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                <button
                  onClick={() => setSortBy('urgent')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    sortBy === 'urgent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Most Urgent
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    sortBy === 'recent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy('impact')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    sortBy === 'impact' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Highest Impact
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map(({ label, value, icon: Icon }) => {
                const isSelected = selectedCategory === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedCategory(value)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Active Results Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <span>Showing <strong>{filteredListings.length}</strong> community items</span>
              {selectedNeighborhood !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  <MapPin className="w-3 h-3" />
                  <span>Filtered Zone</span>
                  <button onClick={() => onNeighborhoodChange('all')} className="ml-1 text-emerald-600 font-bold">✕</button>
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Community Resource Feed
            </div>
          </div>

          {/* Marketplace Grid */}
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredListings.map(listing => (
                <ResourceCard
                  key={listing.id}
                  listing={listing}
                  onClaim={onClaimItem}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">No items found matching criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Be the first to list surplus in this zone with our &lt; 20-second Gemini AI uploader.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                    setStatusFilter('all');
                    onNeighborhoodChange('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => onOpenUpload()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Donate Surplus with AI
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: COMMUNITY FRIDGES MONITOR */}
      {activeTab === 'fridges' && (
        <CommunityFridgesMonitor
          fridges={fridges}
          onRestockFridge={onRestockFridge}
        />
      )}

      {/* TAB 3: COMMUNITY GRATITUDE & STORIES */}
      {activeTab === 'stories' && (
        <GratitudeWall
          stories={stories}
          onHeartStory={onHeartStory}
          onStoryCreated={onStoryCreated}
        />
      )}

    </div>
  );
};
