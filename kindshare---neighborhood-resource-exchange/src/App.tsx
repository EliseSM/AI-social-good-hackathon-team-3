import React, { useState, useEffect, useCallback } from 'react';
import { 
  ResourceListing, 
  CommunityNeed, 
  GratitudeStory, 
  CommunityFridgeStatus, 
  SocialImpactStats 
} from './types/resource';
import { Navbar } from './components/Navbar';
import { ImpactTicker } from './components/ImpactTicker';
import { MarketplaceView } from './components/MarketplaceView';
import { MapView } from './components/MapView';
import { UploadModal } from './components/UploadModal';
import { ClaimChatModal } from './components/ClaimChatModal';
import { SafetyGuideModal } from './components/SafetyGuideModal';
import { NeedsChatWidget } from './components/NeedsChatWidget';
import { 
  HeartHandshake, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  PlusCircle 
} from 'lucide-react';
import { INITIAL_IMPACT_STATS } from './data/seedListings';

export default function App() {
  const [currentView, setCurrentView] = useState<'marketplace' | 'map'>('marketplace');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [listings, setListings] = useState<ResourceListing[]>([]);
  const [needs, setNeeds] = useState<CommunityNeed[]>([]);
  const [stories, setStories] = useState<GratitudeStory[]>([]);
  const [fridges, setFridges] = useState<CommunityFridgeStatus[]>([]);
  const [impactStats, setImpactStats] = useState<SocialImpactStats>(INITIAL_IMPACT_STATS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Active state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [targetNeedForUpload, setTargetNeedForUpload] = useState<CommunityNeed | null>(null);
  const [isSafetyOpen, setIsSafetyOpen] = useState<boolean>(false);
  const [activeClaimListing, setActiveClaimListing] = useState<ResourceListing | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadData = useCallback(async () => {
    try {
      const [listingsRes, needsRes, storiesRes, fridgesRes, metricsRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/needs'),
        fetch('/api/gratitude'),
        fetch('/api/fridges'),
        fetch('/api/metrics')
      ]);

      if (listingsRes.ok) setListings(await listingsRes.json());
      if (needsRes.ok) setNeeds(await needsRes.json());
      if (storiesRes.ok) setStories(await storiesRes.json());
      if (fridgesRes.ok) setFridges(await fridgesRes.json());
      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (m.impactStats) setImpactStats(m.impactStats);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleListingCreated = (newListing: ResourceListing) => {
    setListings(prev => [newListing, ...prev]);
    // update stats
    setImpactStats(prev => ({
      ...prev,
      mealsRescued: prev.mealsRescued + (newListing.category === 'Food' ? 3 : 0),
      poundsFoodDiverted: prev.poundsFoodDiverted + (newListing.category === 'Food' ? 4 : 0),
      warmthItemsDelivered: prev.warmthItemsDelivered + (newListing.category === 'Clothing' ? 1 : 0),
      co2EmissionsSavedKg: prev.co2EmissionsSavedKg + Math.round(newListing.co2SavedKg || 3),
      neighborsHelpedThisWeek: prev.neighborsHelpedThisWeek + 1
    }));

    if (newListing.fulfillmentForNeedId) {
      setNeeds(prev => prev.map(n => n.id === newListing.fulfillmentForNeedId ? { ...n, status: 'fulfilled' } : n));
      showToast(`🎯 Need fulfilled! "${newListing.title}" published for the neighborhood.`);
    } else {
      showToast(`🎉 "${newListing.title}" listed! Available for neighbors.`);
    }
  };

  const handleListingUpdated = (updatedListing: ResourceListing) => {
    setListings(prev =>
      prev.map(item => (item.id === updatedListing.id ? updatedListing : item))
    );
    if (activeClaimListing?.id === updatedListing.id) {
      setActiveClaimListing(updatedListing);
    }
    if (updatedListing.status === 'claimed') {
      setImpactStats(prev => ({ ...prev, neighborsHelpedThisWeek: prev.neighborsHelpedThisWeek + 1 }));
      showToast(`✅ Safe exchange for "${updatedListing.title}" completed!`);
    }
  };

  const handleNeedCreated = (newNeed: CommunityNeed) => {
    setNeeds(prev => [newNeed, ...prev]);
    showToast(`📢 Urgent community need "${newNeed.title}" broadcast to neighborhood donors.`);
  };

  const handleStoryCreated = (newStory: GratitudeStory) => {
    setStories(prev => [newStory, ...prev]);
    showToast(`💖 Gratitude shared! Inspiring neighborhood solidarity.`);
  };

  const handleHeartStory = async (storyId: string) => {
    try {
      const res = await fetch(`/api/gratitude/${storyId}/heart`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setStories(prev => prev.map(s => s.id === storyId ? updated : s));
      }
    } catch (err) {
      console.error('Error hearting story:', err);
    }
  };

  const handleOpenUploadForNeed = (targetNeed?: CommunityNeed) => {
    setTargetNeedForUpload(targetNeed || null);
    setIsUploadOpen(true);
  };

  const handleRestockFridge = (fridge: CommunityFridgeStatus) => {
    setTargetNeedForUpload({
      id: `restock-${fridge.id}`,
      title: `Restock for ${fridge.name}`,
      category: 'Food',
      quantityRequested: fridge.urgentNeeds.join(', '),
      urgency: 'urgent',
      neighborhoodId: 'mission',
      neighborhoodName: fridge.neighborhoodName,
      requesterType: 'Community Pantry Steward',
      reason: `Fridge is at ${fridge.fullnessPercent}% capacity. Immediate nutritious produce needed.`,
      createdAt: new Date().toISOString(),
      status: 'open'
    });
    setIsUploadOpen(true);
  };

  const activeCount = listings.filter(l => l.status === 'available').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-200">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedNeighborhood={selectedNeighborhood}
        onNeighborhoodChange={setSelectedNeighborhood}
        onOpenUpload={() => handleOpenUploadForNeed()}
        onOpenSafety={() => setIsSafetyOpen(true)}
        activeCount={activeCount}
      />

      {/* Live Social Impact Ticker */}
      <ImpactTicker
        stats={impactStats}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">
              Loading hyper-local mutual aid surplus & community hubs...
            </p>
          </div>
        ) : currentView === 'marketplace' ? (
          <MarketplaceView
            listings={listings}
            needs={needs}
            stories={stories}
            fridges={fridges}
            selectedNeighborhood={selectedNeighborhood}
            onNeighborhoodChange={setSelectedNeighborhood}
            onClaimItem={(listing) => setActiveClaimListing(listing)}
            onOpenUpload={handleOpenUploadForNeed}
            onNeedCreated={handleNeedCreated}
            onStoryCreated={handleStoryCreated}
            onHeartStory={handleHeartStory}
            onRestockFridge={handleRestockFridge}
          />
        ) : (
          <MapView
            listings={listings}
            selectedNeighborhood={selectedNeighborhood}
            onNeighborhoodChange={setSelectedNeighborhood}
            onClaimItem={(listing) => setActiveClaimListing(listing)}
          />
        )}

      </main>

      {/* Floating Action Button on Mobile (Left side to avoid blocking Chatbot on Right) */}
      <div className="fixed bottom-5 left-5 sm:hidden z-20">
        <button
          onClick={() => handleOpenUploadForNeed()}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black px-4 py-3 rounded-2xl shadow-xl border border-amber-300 active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-xs">Give Surplus</span>
        </button>
      </div>

      {/* Floating AI Needs Intake Chatbot in Bottom Right Corner */}
      <NeedsChatWidget
        selectedNeighborhood={selectedNeighborhood}
        onNeighborhoodChange={setSelectedNeighborhood}
        onNeedCreated={handleNeedCreated}
        onClaimItem={(listing) => setActiveClaimListing(listing)}
        onViewNeedsBoard={() => {
          if (currentView !== 'marketplace') {
            setCurrentView('marketplace');
          }
          setTimeout(() => {
            const el = document.getElementById('community-needs-board');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 120);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setTargetNeedForUpload(null);
        }}
        onListingCreated={handleListingCreated}
        targetNeed={targetNeedForUpload}
      />

      <ClaimChatModal
        listing={activeClaimListing}
        isOpen={!!activeClaimListing}
        onClose={() => setActiveClaimListing(null)}
        onListingUpdated={handleListingUpdated}
      />

      <SafetyGuideModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-10 border-t border-slate-800/80 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-white">KindShare Mutual Aid Marketplace</span>
                <p className="text-[11px] text-slate-400">Connecting surplus with community needs across San Francisco</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Public Pickup Hubs
              </span>
              <span>•</span>
              <span>Verified Community Fridges</span>
              <span>•</span>
              <button
                onClick={() => setIsSafetyOpen(true)}
                className="text-emerald-400 hover:underline"
              >
                Safety & Handoff Guide
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <p>Empowering neighborhoods across San Francisco to share with dignity and respect.</p>
            <p className="font-mono text-emerald-400/80">3,590+ lbs food diverted • 540+ warm layers gifted</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
