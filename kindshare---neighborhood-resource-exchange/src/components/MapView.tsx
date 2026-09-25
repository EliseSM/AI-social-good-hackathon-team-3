import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ResourceListing, SafeHub, Category } from '../types/resource';
import { NEIGHBORHOODS, getNeighborhoodById } from '../data/neighborhoods';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Utensils, 
  Shirt, 
  Sparkles, 
  Home, 
  X, 
  Navigation,
  MessageSquare,
  Clock,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface MapViewProps {
  listings: ResourceListing[];
  selectedNeighborhood: string;
  onNeighborhoodChange: (id: string) => void;
  onClaimItem: (listing: ResourceListing) => void;
}

const CATEGORY_COLORS: Record<Category, { bg: string; border: string; text: string; iconEmoji: string }> = {
  Food: { bg: '#10b981', border: '#047857', text: '#ffffff', iconEmoji: '🍏' },
  Clothing: { bg: '#0ea5e9', border: '#0369a1', text: '#ffffff', iconEmoji: '🧥' },
  Hygiene: { bg: '#a855f7', border: '#7e22ce', text: '#ffffff', iconEmoji: '🧼' },
  Household: { bg: '#f59e0b', border: '#b45309', text: '#ffffff', iconEmoji: '🏠' }
};

export const MapView: React.FC<MapViewProps> = ({
  listings,
  selectedNeighborhood,
  onNeighborhoodChange,
  onClaimItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [showHubs, setShowHubs] = useState(true);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hubsLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Filter listings based on search query, category, and neighborhood
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // 1. Neighborhood match
      if (selectedNeighborhood !== 'all' && item.neighborhoodId !== selectedNeighborhood) {
        return false;
      }

      // 2. Category match
      if (activeCategory !== 'All' && item.category !== activeCategory) {
        return false;
      }

      // 3. Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesNeighborhood = item.neighborhoodName.toLowerCase().includes(q);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(q));
        const matchesCondition = item.condition.toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesCategory || matchesNeighborhood || matchesTags || matchesCondition;
      }

      return true;
    });
  }, [listings, selectedNeighborhood, activeCategory, searchQuery]);

  // Safe Handoff Hubs to show
  const filteredHubs = useMemo(() => {
    if (!showHubs) return [];
    if (selectedNeighborhood !== 'all') {
      const nhood = NEIGHBORHOODS.find(n => n.id === selectedNeighborhood);
      return nhood ? nhood.safeHandoffHubs : [];
    }
    return NEIGHBORHOODS.flatMap(n => n.safeHandoffHubs);
  }, [showHubs, selectedNeighborhood]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // San Francisco center coordinates
    const map = L.map(mapContainerRef.current, {
      center: [37.765, -122.435],
      zoom: 12,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // CartoDB Voyager tiles when an API key is provided (nicer styling); CARTO's
    // anonymous raster tile endpoint now requires a key and 404s to a placeholder
    // image otherwise, so fall back to the standard OpenStreetMap tile server,
    // which remains free and keyless.
    const cartoApiKey = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();
    const tileUrl = cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoApiKey)}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' + (cartoApiKey ? ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>' : ''),
      maxZoom: 19,
      subdomains: cartoApiKey ? 'abcd' : 'abc',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const hubsLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    hubsLayerRef.current = hubsLayer;

    // Invalidate size after mount so tiles load fully
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map markers when filteredListings, hubs, or activeListingId change
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const hubsLayer = hubsLayerRef.current;
    if (!map || !markersLayer || !hubsLayer) return;

    markersLayer.clearLayers();
    hubsLayer.clearLayers();
    markerMapRef.current.clear();

    const bounds = L.latLngBounds([]);

    // 1. Add Filtered Resource Pins to Map
    filteredListings.forEach(item => {
      const { lat, lng } = item.coordinates;
      bounds.extend([lat, lng]);

      const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Food;
      const isClaimed = item.status === 'claimed';
      const isReserved = item.status === 'reserved';
      const isSelected = activeListingId === item.id;

      // Custom HTML Pin DivIcon
      const pinHtml = `
        <div class="relative group cursor-pointer transform -translate-x-1/2 -translate-y-full transition-transform hover:scale-110">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs text-white border-2 ${
            isSelected ? 'ring-4 ring-amber-400 scale-110' : ''
          }" style="background-color: ${isClaimed ? '#64748b' : colors.bg}; border-color: ${colors.border};">
            <span class="text-sm">${colors.iconEmoji}</span>
            <span class="max-w-[100px] truncate text-[11px]">${item.title}</span>
          </div>
          <div class="w-2.5 h-2.5 rotate-45 mx-auto -mt-1 shadow-sm" style="background-color: ${colors.bg};"></div>
          ${!isClaimed && !isReserved ? '<span class="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span></span>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-resource-pin',
        html: pinHtml,
        iconSize: [120, 36],
        iconAnchor: [60, 36],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Interactive popup
      const popupHtml = `
        <div class="p-1 max-w-[240px] font-sans">
          <div class="w-full h-28 rounded-xl overflow-hidden mb-2 relative bg-slate-100">
            <img src="${item.imageUrl}" alt="${item.title}" class="w-full h-full object-cover" />
            <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs" style="background-color: ${colors.bg};">
              ${item.category}
            </span>
          </div>
          <h4 class="font-extrabold text-sm text-slate-900 leading-snug mb-1 line-clamp-2">${item.title}</h4>
          <p class="text-xs text-slate-600 mb-2 line-clamp-2">${item.description}</p>
          <div class="flex items-center justify-between text-[11px] text-slate-500 mb-2.5">
            <span class="font-medium bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">${item.neighborhoodName}</span>
            <span class="font-bold text-emerald-700">${item.quantity}</span>
          </div>
          <button 
            id="claim-btn-${item.id}"
            class="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              isClaimed ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            }"
            ${isClaimed ? 'disabled' : ''}
          >
            ${isClaimed ? 'Already Claimed' : 'Claim Item / Coordinate Pickup'}
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { minWidth: 220, className: 'clean-resource-popup' });

      marker.on('popupopen', () => {
        setActiveListingId(item.id);
        const btn = document.getElementById(`claim-btn-${item.id}`);
        if (btn) {
          btn.onclick = () => {
            onClaimItem(item);
          };
        }
      });

      marker.on('popupclose', () => {
        if (activeListingId === item.id) {
          setActiveListingId(null);
        }
      });

      marker.addTo(markersLayer);
      markerMapRef.current.set(item.id, marker);
    });

    // 2. Add Safe Hubs to Map
    filteredHubs.forEach(hub => {
      const { lat, lng } = hub.coordinates;
      bounds.extend([lat, lng]);

      const hubIconHtml = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 border-2 border-white shadow-md text-white hover:scale-125 transition-transform cursor-pointer" title="${hub.name}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      `;

      const hubIcon = L.divIcon({
        className: 'custom-hub-pin',
        html: hubIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const hubMarker = L.marker([lat, lng], { icon: hubIcon });

      const hubPopupHtml = `
        <div class="p-1 max-w-[220px] font-sans">
          <div class="flex items-center gap-1.5 text-teal-700 text-xs font-bold mb-1">
            <span class="p-1 rounded-md bg-teal-50">🛡️ Verified Safe Hub</span>
          </div>
          <h4 class="font-extrabold text-sm text-slate-900 mb-0.5">${hub.name}</h4>
          <p class="text-xs text-slate-500 mb-1">${hub.address}</p>
          <div class="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1">
            Open: ${hub.openHours}
          </div>
          <p class="text-[11px] text-slate-600 italic">Safe public meetup spot with high visibility & staff presence.</p>
        </div>
      `;

      hubMarker.bindPopup(hubPopupHtml, { minWidth: 200 });
      hubMarker.addTo(hubsLayer);
    });

    // Auto-fit bounds if we have search results or neighborhood switch
    if (searchQuery.trim() && filteredListings.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 0.5 });
    }
  }, [filteredListings, filteredHubs, activeListingId, searchQuery, onClaimItem]);

  // Handle neighborhood pan when changed externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedNeighborhood === 'all') {
      map.flyTo([37.765, -122.435], 12, { duration: 0.8 });
    } else {
      const nhood = getNeighborhoodById(selectedNeighborhood);
      map.flyTo([nhood.centerLat, nhood.centerLng], 14, { duration: 0.8 });
    }
  }, [selectedNeighborhood]);

  const handleSelectListing = (listing: ResourceListing) => {
    setActiveListingId(listing.id);
    const map = mapRef.current;
    if (map) {
      map.flyTo([listing.coordinates.lat, listing.coordinates.lng], 15, { duration: 0.6 });
      const marker = markerMapRef.current.get(listing.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    setActiveCategory('All');
    onNeighborhoodChange('all');
  };

  return (
    <div className="space-y-4">
      
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
        
        {/* Search input filtering data points on map image */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search map: bananas, warm fleece, diapers, pantry, pot..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-0.5"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Neighborhood Quick Select */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <select
              value={selectedNeighborhood}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-slate-900"
            >
              <option value="all">All San Francisco</option>
              {NEIGHBORHOODS.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories & Layer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'All'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>All Items ({listings.length})</span>
            </button>
            <button
              onClick={() => setActiveCategory('Food')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'Food'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Food</span>
            </button>
            <button
              onClick={() => setActiveCategory('Clothing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'Clothing'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Clothing</span>
            </button>
            <button
              onClick={() => setActiveCategory('Hygiene')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'Hygiene'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hygiene</span>
            </button>
            <button
              onClick={() => setActiveCategory('Household')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'Household'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Household</span>
            </button>
          </div>

          {/* Toggle Verified Safe Hubs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHubs(!showHubs)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                showHubs 
                  ? 'bg-teal-50 border-teal-300 text-teal-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Safe Hubs: {showHubs ? 'ON' : 'OFF'}</span>
            </button>

            {/* Reset Filters when active */}
            {(searchQuery || activeCategory !== 'All' || selectedNeighborhood !== 'all') && (
              <button
                onClick={handleResetSearch}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 px-1 py-1"
              >
                Reset All Filters
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Main Map & Filtered Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Real Geographic Map Image Canvas (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-3 border border-slate-200 shadow-lg relative overflow-hidden">
          
          {/* Map Top Bar with Live Data Point Filter Counter */}
          <div className="flex items-center justify-between px-3 py-2 text-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-slate-900">
                Interactive San Francisco Resource Map
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {filteredListings.length} {filteredListings.length === 1 ? 'Point' : 'Points'} on Map
              </span>
              {searchQuery && (
                <span className="text-slate-500 hidden sm:inline truncate max-w-[140px]">
                  filtered by "{searchQuery}"
                </span>
              )}
            </div>
          </div>

          {/* Leaflet Street Map Container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 z-10"
            style={{ minHeight: '520px' }}
          />

          {/* Map Legend Overlay */}
          <div className="mt-3 px-3 py-1.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Map Legend:</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Food
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Clothing
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Hygiene
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Household
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Safe Public Hub
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Click any pin to inspect or claim</span>
          </div>

        </div>

        {/* Side Panel: Filtered Data Points & Items (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-3">
          
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Matching Data Points ({filteredListings.length})
              </h3>
              <p className="text-xs text-slate-500">
                Filtered dynamically by search & neighborhood
              </p>
            </div>
            {filteredListings.length > 0 && (
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                {filteredListings.length}
              </span>
            )}
          </div>

          {/* List of Data Points on the Map */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredListings.length > 0 ? (
              filteredListings.map(listing => {
                const colors = CATEGORY_COLORS[listing.category] || CATEGORY_COLORS.Food;
                const isSelected = activeListingId === listing.id;

                return (
                  <div
                    key={listing.id}
                    onClick={() => handleSelectListing(listing)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md ${
                      isSelected 
                        ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative">
                        <img 
                          src={listing.imageUrl} 
                          alt={listing.title} 
                          className="w-full h-full object-cover" 
                        />
                        <span 
                          className="absolute bottom-1 right-1 text-xs" 
                          title={listing.category}
                        >
                          {colors.iconEmoji}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span 
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: colors.bg }}
                          >
                            {listing.category}
                          </span>
                          <span className="text-[11px] font-bold text-slate-900 truncate">
                            {listing.quantity}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 truncate mb-1">
                          {listing.title}
                        </h4>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{listing.neighborhoodName}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {listing.condition}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClaimItem(listing);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                          >
                            Claim Item
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  No matching points on map
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {searchQuery 
                    ? `No surplus items matched "${searchQuery}". Try a broader term like 'food' or 'clothing'.`
                    : 'No items currently in this neighborhood or category.'}
                </p>
                <button
                  onClick={handleResetSearch}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear Search & Show All Points
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
