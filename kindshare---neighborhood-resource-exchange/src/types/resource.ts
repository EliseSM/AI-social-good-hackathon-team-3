export type Category = 'Food' | 'Clothing' | 'Hygiene' | 'Household';

export interface SafeHub {
  id: string;
  name: string;
  type: 'fridge' | 'library' | 'transit' | 'civic';
  address: string;
  safetyFeatures: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  openHours: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  city: string;
  hexId: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  safeHandoffHubs: SafeHub[];
}

export interface ResourceListing {
  id: string;
  title: string;
  category: Category;
  quantity: string;
  description: string;
  condition: string;
  tags: string[];
  imageUrl: string;
  neighborhoodId: string;
  neighborhoodName: string;
  // Snap coordinates (obfuscated to neighborhood hex/centroid)
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'available' | 'reserved' | 'claimed';
  createdAt: string; // ISO
  claimedAt?: string;
  suggestedHub: SafeHub;
  donorAnonymousId: string;
  // Telemetry & Accuracy tracking
  aiGenerated: boolean;
  wasEditedByDonor: boolean;
  timeToListSeconds: number;
  piiStripped: boolean;
  expiryNotice?: string;
  // Social impact attributes
  impactMetric?: string;
  urgency?: 'critical' | 'high' | 'normal';
  co2SavedKg?: number;
  donorTrustLevel?: string;
  fulfillmentForNeedId?: string;
}

export interface CommunityNeed {
  id: string;
  title: string;
  category: Category;
  quantityRequested: string;
  urgency: 'critical' | 'urgent' | 'moderate';
  neighborhoodId: string;
  neighborhoodName: string;
  hubId?: string;
  requesterType: 'Community Pantry Steward' | 'Outreach Volunteer' | 'Local Family' | 'Senior Center' | 'Neighbor';
  reason: string;
  createdAt: string;
  status: 'open' | 'fulfilled';
  fulfilledByListingId?: string;
}

export interface GratitudeStory {
  id: string;
  listingId?: string;
  authorRole: 'Recipient' | 'Pantry Volunteer' | 'Community Member';
  neighborhoodName: string;
  itemName: string;
  message: string;
  createdAt: string;
  heartsCount: number;
  tag: string;
}

export interface CommunityFridgeStatus {
  id: string;
  name: string;
  neighborhoodName: string;
  address: string;
  fullnessPercent: number;
  lastRestockedAgo: string;
  temperatureStatus: 'Normal (38°F)' | 'Clean & Active';
  urgentNeeds: string[];
  dailyPoundsDistributed: number;
}

export interface SocialImpactStats {
  mealsRescued: number;
  poundsFoodDiverted: number;
  warmthItemsDelivered: number;
  hygieneKitsShared: number;
  co2EmissionsSavedKg: number;
  activeCommunityFridges: number;
  neighborsHelpedThisWeek: number;
  hoursAvgTimeToClaim: number;
}

export interface ChatMessage {
  id: string;
  listingId: string;
  senderType: 'receiver' | 'donor' | 'system';
  senderLabel: string;
  text: string;
  timestamp: string;
  hubConfirmed?: boolean;
}

export interface AIAnalysisResult {
  item_title: string;
  category: Category;
  quantity: string;
  description: string;
  condition_tags: string[];
  pii_detected: boolean;
  inappropriate_flag: boolean;
  confidence_score?: number;
  estimated_impact?: string;
}

export interface PlatformMetrics {
  avgTimeToListSeconds: number;
  aiAccuracyRate: number; // percentage (0-100)
  listingLiquidityRate: number; // percentage claimed within 24h
  totalListingsCount: number;
  activeListingsCount: number;
  claimedListingsCount: number;
  weeklyActiveReceivers: number;
  neighborhoodCount: number;
  impactStats?: SocialImpactStats;
}

export interface NeedsDraft {
  title: string;
  category: Category;
  quantityRequested: string;
  urgency: 'critical' | 'urgent' | 'moderate';
  neighborhoodId: string;
  neighborhoodName: string;
  requesterType: CommunityNeed['requesterType'];
  reason: string;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  hasDetectedNeed?: boolean;
  detectedNeed?: NeedsDraft;
  suggestedFollowUps?: string[];
  postedNeedId?: string;
  matchingListings?: ResourceListing[];
}

