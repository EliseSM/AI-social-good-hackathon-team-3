import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  INITIAL_LISTINGS, 
  INITIAL_COMMUNITY_NEEDS, 
  INITIAL_IMPACT_STATS, 
  INITIAL_GRATITUDE_STORIES, 
  COMMUNITY_FRIDGES_STATUS 
} from './src/data/seedListings.ts';
import { NEIGHBORHOODS, obfuscateCoordinates, getNeighborhoodById } from './src/data/neighborhoods.ts';
import { 
  ResourceListing, 
  ChatMessage, 
  PlatformMetrics, 
  Category, 
  CommunityNeed, 
  GratitudeStory, 
  SocialImpactStats, 
  CommunityFridgeStatus 
} from './src/types/resource.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// In-memory mutable stores
let listingsStore: ResourceListing[] = [...INITIAL_LISTINGS];
let communityNeedsStore: CommunityNeed[] = [...INITIAL_COMMUNITY_NEEDS];
let gratitudeStoriesStore: GratitudeStory[] = [...INITIAL_GRATITUDE_STORIES];
let impactStatsStore: SocialImpactStats = { ...INITIAL_IMPACT_STATS };
let fridgesStore: CommunityFridgeStatus[] = [...COMMUNITY_FRIDGES_STATUS];

const messagesStore: Record<string, ChatMessage[]> = {
  'res-106': [
    {
      id: 'm1',
      listingId: 'res-106',
      senderType: 'system',
      senderLabel: 'KindShare Safe Handoff Bot',
      text: 'Anonymous connection established for "Fresh Bakery Sourdough Loaves & Rolls". Suggested safe exchange spot: 16th St Mission BART Station Plaza.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: 'm2',
      listingId: 'res-106',
      senderType: 'receiver',
      senderLabel: 'Neighbor in Need (Anonymous)',
      text: 'Hello, could I pick up one of the loaves? I can be at the plaza entrance near the escalators in 15 minutes.',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString()
    },
    {
      id: 'm3',
      listingId: 'res-106',
      senderType: 'donor',
      senderLabel: 'Donor (Anonymous)',
      text: 'Sounds great! I will leave it in a clean brown paper bag with the station attendant or meet you right outside under the lights.',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      hubConfirmed: true
    }
  ]
};

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper: fetch remote image to base64 if needed
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  return {
    base64: buffer.toString('base64'),
    mimeType,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. AI Inference Endpoint (Gemini 3.8 Flash Vision with Social Impact Estimator)
app.post('/api/analyze-item', async (req: Request, res: Response) => {
  try {
    let { imageBase64, mimeType, imageUrl } = req.body;

    if (!imageBase64 && imageUrl) {
      const fetched = await urlToBase64(imageUrl);
      imageBase64 = fetched.base64;
      mimeType = fetched.mimeType;
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided. Please supply imageBase64 or imageUrl.' });
    }

    // Clean base64 if data URI prefix is present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanMimeType = (mimeType && mimeType.includes('image')) ? mimeType : 'image/jpeg';

    if (!ai) {
      // Intelligent fallback when API key is not yet set
      console.warn('GEMINI_API_KEY not configured. Providing fallback response.');
      return res.json({
        item_title: 'Community Care Resource Pack',
        category: 'Food',
        quantity: '1 item bundle',
        description: 'Clean and safe surplus in ready-to-share condition.',
        condition_tags: ['Fresh Surplus', 'Safe to Share'],
        pii_detected: false,
        inappropriate_flag: false,
        confidence_score: 0.88,
        estimated_impact: 'Rescues ~3 lbs surplus • Prevents landfill waste',
        model_used: 'fallback'
      });
    }

    const promptText = `You are an AI assistant for a high-impact community mutual aid and surplus donation marketplace. Analyze the provided image and extract structured JSON:
item_title: A concise, 3-5 word title (e.g., '3 Ripe Bananas', 'Pack of 4 Toothbrushes', 'Warm Winter Parka', 'Canned Soup & Pasta').
category: Categorize strictly as either 'Food', 'Clothing', 'Hygiene', or 'Household'.
quantity: Estimated count or volume (e.g. '1 bunch (approx 5)', 'Pack of 6', '1 jacket, size M').
description: A short, one-sentence description of the item and its visible condition.
condition_tags: An array of 2-4 short descriptor tags (e.g., ['Fresh Produce', 'Rescued Food', 'Perishable'] or ['Unopened', 'Dental Care'] or ['Clean', 'Warm Layer']).
estimated_impact: A brief, inspiring 1-sentence estimate of the social or environmental impact of sharing this item (e.g., 'Rescues ~4 lbs fresh food from landfill', 'Provides life-saving thermal insulation on cold nights', 'Supplies critical dignity and sanitation for 2 weeks').
pii_detected: Boolean. Detect any Personally Identifiable Information (PII) accidentally captured in the photo (e.g., shipping labels on a box, customer names, home delivery addresses, tracking barcodes, phone numbers). Strip and ignore all PII and NEVER include any detected names or addresses in the title or description. If PII was found and stripped, set pii_detected to true.
inappropriate_flag: Boolean. If the image contains sensitive or inappropriate content (weapons, prescription medications, illicit substances, alcohol, hazardous materials, or explicit content), set inappropriate_flag to true.
confidence_score: Confidence estimate from 0.0 to 1.0.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: cleanMimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            item_title: { type: Type.STRING, description: 'Concise 3-5 word title' },
            category: { type: Type.STRING, description: 'Food, Clothing, Hygiene, or Household' },
            quantity: { type: Type.STRING, description: 'Estimated count or volume' },
            description: { type: Type.STRING, description: 'Short one-sentence description and condition' },
            condition_tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 short tags'
            },
            estimated_impact: { type: Type.STRING, description: 'One-sentence social or ecological impact' },
            pii_detected: { type: Type.BOOLEAN, description: 'True if PII was detected and stripped' },
            inappropriate_flag: { type: Type.BOOLEAN, description: 'True if restricted or sensitive content' },
            confidence_score: { type: Type.NUMBER, description: '0 to 1.0 confidence score' },
          },
          required: [
            'item_title',
            'category',
            'quantity',
            'description',
            'condition_tags',
            'estimated_impact',
            'pii_detected',
            'inappropriate_flag',
          ],
        },
      },
    });

    const responseText = response.text?.trim() || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    const validCategories: Category[] = ['Food', 'Clothing', 'Hygiene', 'Household'];
    if (!validCategories.includes(parsedData.category)) {
      parsedData.category = 'Household';
    }

    return res.json({
      ...parsedData,
      model_used: 'gemini-3.8-flash'
    });

  } catch (error: any) {
    console.error('Error analyzing image with Gemini:', error);
    return res.status(500).json({
      error: 'Failed to analyze image with Gemini AI',
      details: error.message,
    });
  }
});

// 2. Get All Marketplace Listings
app.get('/api/listings', (req: Request, res: Response) => {
  const { category, neighborhood, status, search, urgency } = req.query;

  let results = [...listingsStore];

  if (category && category !== 'All') {
    results = results.filter(item => item.category.toLowerCase() === String(category).toLowerCase());
  }

  if (neighborhood && neighborhood !== 'all') {
    results = results.filter(item => item.neighborhoodId === neighborhood);
  }

  if (status && status !== 'all') {
    results = results.filter(item => item.status === status);
  }

  if (urgency && urgency !== 'all') {
    results = results.filter(item => item.urgency === urgency);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q)) ||
      (item.impactMetric && item.impactMetric.toLowerCase().includes(q))
    );
  }

  results.sort((a, b) => {
    // Critical urgency first
    if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
    if (b.urgency === 'critical' && a.urgency !== 'critical') return 1;
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (b.status === 'available' && a.status !== 'available') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return res.json(results);
});

// 3. Create New Listing (Zero-Friction Uploader flow + Impact Accumulator)
app.post('/api/listings', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const neighborhoodId = body.neighborhoodId || 'mission';
    const neighborhood = getNeighborhoodById(neighborhoodId);
    const obfuscatedCoords = obfuscateCoordinates(neighborhoodId);

    const safeHub = body.suggestedHubId
      ? neighborhood.safeHandoffHubs.find(h => h.id === body.suggestedHubId) || neighborhood.safeHandoffHubs[0]
      : neighborhood.safeHandoffHubs[0];

    const category: Category = body.category || 'Food';

    // Calculate realistic social impact
    let defaultImpact = body.impactMetric;
    let co2Saved = body.co2SavedKg;

    if (!defaultImpact) {
      if (category === 'Food') {
        defaultImpact = 'Rescues ~4.5 lbs fresh food • Feeds 2-3 neighbors';
        co2Saved = 3.2;
      } else if (category === 'Clothing') {
        defaultImpact = 'Protects against cold damp weather • Reusable circular wear';
        co2Saved = 9.1;
      } else if (category === 'Hygiene') {
        defaultImpact = 'Provides essential daily health, dignity & sanitation';
        co2Saved = 1.5;
      } else {
        defaultImpact = 'Extends vital household goods into immediate community use';
        co2Saved = 6.4;
      }
    }

    const newListing: ResourceListing = {
      id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: body.title || 'Donated Community Item',
      category,
      quantity: body.quantity || '1 item',
      description: body.description || '',
      condition: body.condition || 'Good Condition',
      tags: body.tags || ['Community Surplus', 'Zero Waste'],
      imageUrl: body.imageUrl || 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
      neighborhoodId: neighborhood.id,
      neighborhoodName: neighborhood.name,
      coordinates: obfuscatedCoords,
      status: 'available',
      createdAt: new Date().toISOString(),
      suggestedHub: safeHub,
      donorAnonymousId: `Neighbor #${Math.floor(100 + Math.random() * 900)}`,
      aiGenerated: body.aiGenerated ?? true,
      wasEditedByDonor: body.wasEditedByDonor ?? false,
      timeToListSeconds: body.timeToListSeconds || 16,
      piiStripped: body.piiStripped ?? true,
      expiryNotice: body.expiryNotice || (category === 'Food' ? 'Fresh - best within 48h' : undefined),
      impactMetric: defaultImpact,
      urgency: body.urgency || (category === 'Food' ? 'high' : 'normal'),
      co2SavedKg: co2Saved || 3.0,
      donorTrustLevel: 'Generous Giver • Active Community Member',
      fulfillmentForNeedId: body.fulfillmentForNeedId
    };

    listingsStore.unshift(newListing);

    // If this fulfilled an urgent community need, update it!
    if (body.fulfillmentForNeedId) {
      const need = communityNeedsStore.find(n => n.id === body.fulfillmentForNeedId);
      if (need) {
        need.status = 'fulfilled';
        need.fulfilledByListingId = newListing.id;
      }
    }

    // Accumulate global community impact stats
    if (category === 'Food') {
      impactStatsStore.mealsRescued += 3;
      impactStatsStore.poundsFoodDiverted += 4;
    } else if (category === 'Clothing') {
      impactStatsStore.warmthItemsDelivered += 1;
    } else if (category === 'Hygiene') {
      impactStatsStore.hygieneKitsShared += 1;
    }
    impactStatsStore.co2EmissionsSavedKg += Math.round(newListing.co2SavedKg || 3);
    impactStatsStore.neighborsHelpedThisWeek += 1;

    // Initialize system message in chat
    messagesStore[newListing.id] = [
      {
        id: `sys-${Date.now()}`,
        listingId: newListing.id,
        senderType: 'system',
        senderLabel: 'KindShare Safe Handoff Bot',
        text: `Listing published anonymously in ${neighborhood.name}. Designated safe meetup point: ${safeHub.name} (${safeHub.address}). Impact: ${newListing.impactMetric}`,
        timestamp: new Date().toISOString()
      }
    ];

    return res.status(201).json(newListing);
  } catch (error: any) {
    console.error('Error creating listing:', error);
    return res.status(500).json({ error: 'Failed to create listing', details: error.message });
  }
});

// 4. Claim an Item (Receiver Action)
app.post('/api/listings/:id/claim', (req: Request, res: Response) => {
  const { id } = req.params;
  const listing = listingsStore.find(item => item.id === id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listing.status === 'claimed') {
    return res.status(400).json({ error: 'Item has already been claimed' });
  }

  listing.status = 'reserved';
  listing.claimedAt = new Date().toISOString();

  if (!messagesStore[id]) {
    messagesStore[id] = [];
  }

  messagesStore[id].push({
    id: `claim-note-${Date.now()}`,
    listingId: id,
    senderType: 'system',
    senderLabel: 'KindShare Safe Handoff Bot',
    text: `A neighbor has flagged interest and reserved this item! You can coordinate safe pickup at ${listing.suggestedHub.name} below. Zero personal info or paperwork needed.`,
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, listing });
});

// 5. Complete / Mark Claimed (Trigger Social Impact celebration)
app.post('/api/listings/:id/complete', (req: Request, res: Response) => {
  const { id } = req.params;
  const listing = listingsStore.find(item => item.id === id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.status = 'claimed';
  listing.claimedAt = new Date().toISOString();

  impactStatsStore.neighborsHelpedThisWeek += 1;

  return res.json({ success: true, listing });
});

// 6. Anonymous Messages for a Listing
app.get('/api/listings/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const messages = messagesStore[id] || [];
  return res.json(messages);
});

// 7. Send Anonymous Message
app.post('/api/listings/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const { text, senderType, senderLabel, hubConfirmed } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text required' });
  }

  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    listingId: id,
    senderType: senderType || 'receiver',
    senderLabel: senderLabel || (senderType === 'donor' ? 'Donor (Anonymous)' : 'Neighbor in Need (Anonymous)'),
    text: text.trim(),
    timestamp: new Date().toISOString(),
    hubConfirmed: !!hubConfirmed
  };

  if (!messagesStore[id]) {
    messagesStore[id] = [];
  }
  messagesStore[id].push(newMessage);

  return res.status(201).json(newMessage);
});

// 8. Urgent Community Needs / Wishlist Endpoints
app.get('/api/needs', (_req: Request, res: Response) => {
  return res.json(communityNeedsStore);
});

app.post('/api/needs', (req: Request, res: Response) => {
  try {
    const { title, category, quantityRequested, urgency, neighborhoodId, requesterType, reason } = req.body;
    const nhood = getNeighborhoodById(neighborhoodId || 'mission');

    const newNeed: CommunityNeed = {
      id: `need-${Date.now()}`,
      title: title || 'Urgent Community Need',
      category: category || 'Food',
      quantityRequested: quantityRequested || 'Immediate community request',
      urgency: urgency || 'urgent',
      neighborhoodId: nhood.id,
      neighborhoodName: nhood.name,
      hubId: nhood.safeHandoffHubs[0]?.id,
      requesterType: requesterType || 'Outreach Volunteer',
      reason: reason || 'Acute local community need.',
      createdAt: new Date().toISOString(),
      status: 'open'
    };

    communityNeedsStore.unshift(newNeed);
    return res.status(201).json(newNeed);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create need', details: error.message });
  }
});

// Helper for fallback chat response when offline or key is missing
function createFallbackChatResponse(message: string, currentNeighborhood: any) {
  const lower = (message || '').toLowerCase();

  if (lower.includes('blanket') || lower.includes('coat') || lower.includes('jacket') || lower.includes('warm') || lower.includes('cold') || lower.includes('sock') || lower.includes('sweater')) {
    return {
      replyText: `I completely understand the acute urgency of staying warm, especially during chilly San Francisco nights in ${currentNeighborhood.name}. I've drafted a Critical Community Need request below. You can publish this directly to neighborhood donors with one tap!`,
      hasDetectedNeed: true,
      detectedNeed: {
        title: 'Urgent Warm Winter Blankets & Heavy Coats',
        category: 'Clothing' as Category,
        quantityRequested: '5 to 10 warm jackets / blankets',
        urgency: 'critical' as const,
        neighborhoodId: currentNeighborhood.id,
        neighborhoodName: currentNeighborhood.name,
        requesterType: 'Outreach Volunteer' as const,
        reason: 'Freezing weather protection; neighborhood outreach supplies depleted.'
      },
      suggestedFollowUps: ['Can we also request warm socks?', 'Make urgency critical for tonight', 'Change neighborhood to SOMA']
    };
  }

  if (lower.includes('food') || lower.includes('eat') || lower.includes('pantry') || lower.includes('grocery') || lower.includes('groceries') || lower.includes('soup') || lower.includes('bread') || lower.includes('fruit') || lower.includes('meal') || lower.includes('hungry')) {
    return {
      replyText: `Ensuring everyone has enough nutritious food is our highest community priority. I have formatted an immediate mutual aid food request for ${currentNeighborhood.name} below so nearby neighbors can bring surplus or restock.`,
      hasDetectedNeed: true,
      detectedNeed: {
        title: 'Emergency Nutritious Groceries & Pantry Food',
        category: 'Food' as Category,
        quantityRequested: 'Nutritious pantry goods (canned protein, grains, produce)',
        urgency: 'critical' as const,
        neighborhoodId: currentNeighborhood.id,
        neighborhoodName: currentNeighborhood.name,
        requesterType: 'Community Pantry Steward' as const,
        reason: 'Local community pantry shelves empty; immediate nutritious food needed.'
      },
      suggestedFollowUps: ['Are any community fridges currently stocked?', 'Need non-perishables only', 'Request fresh produce']
    };
  }

  if (lower.includes('baby') || lower.includes('diaper') || lower.includes('formula') || lower.includes('wipes') || lower.includes('infant')) {
    return {
      replyText: `Supporting families and infants is critical and time-sensitive. I have drafted an emergency infant care request below. Click 'Post as Critical Need' to broadcast it instantly to local families and donors.`,
      hasDetectedNeed: true,
      detectedNeed: {
        title: 'Emergency Infant Formula & Diapers Pack',
        category: 'Hygiene' as Category,
        quantityRequested: '2-3 packs diapers (Sizes 3-4) & unopened formula',
        urgency: 'critical' as const,
        neighborhoodId: currentNeighborhood.id,
        neighborhoodName: currentNeighborhood.name,
        requesterType: 'Local Family' as const,
        reason: 'Acute need for infant nourishment and sanitation essentials.'
      },
      suggestedFollowUps: ['Also need gentle baby wipes', 'Mark as urgent for this evening', 'Add baby clothing']
    };
  }

  if (lower.includes('hygiene') || lower.includes('soap') || lower.includes('shampoo') || lower.includes('toothbrush') || lower.includes('toothpaste') || lower.includes('sanitary') || lower.includes('pad') || lower.includes('tampon')) {
    return {
      replyText: `Personal dignity and daily health supplies are essential rights. I've formulated a hygiene supplies community call below ready for publication.`,
      hasDetectedNeed: true,
      detectedNeed: {
        title: 'Essential Dignity & Sanitation Hygiene Kits',
        category: 'Hygiene' as Category,
        quantityRequested: '10 essential hygiene packs (soap, dental, sanitizing)',
        urgency: 'urgent' as const,
        neighborhoodId: currentNeighborhood.id,
        neighborhoodName: currentNeighborhood.name,
        requesterType: 'Outreach Volunteer' as const,
        reason: 'Outreach team distributing daily hygiene essentials to neighbors in need.'
      },
      suggestedFollowUps: ['Include dental care packs', 'Request feminine hygiene supplies', 'Change quantity to 20']
    };
  }

  if (message.trim().length > 15) {
    // Generic detected need from user's custom text
    return {
      replyText: `Thank you for sharing your neighborhood's need. I've summarized this into an actionable request below for ${currentNeighborhood.name}. Review the details and broadcast it to our community network whenever you're ready!`,
      hasDetectedNeed: true,
      detectedNeed: {
        title: message.trim().slice(0, 45),
        category: 'Household' as Category,
        quantityRequested: 'Immediate community request',
        urgency: 'urgent' as const,
        neighborhoodId: currentNeighborhood.id,
        neighborhoodName: currentNeighborhood.name,
        requesterType: 'Neighbor' as const,
        reason: message.trim()
      },
      suggestedFollowUps: ['Change category to Food', 'Mark as Critical urgency', 'Add specific quantity']
    };
  }

  // Welcoming prompt
  return {
    replyText: `Hello neighbor! 👋 I'm your KindShare Community Needs Assistant. Tell me what resources your community, pantry, shelter, or family is currently missing. I'll automatically draft a structured Critical Need you can post to local donors in seconds!`,
    hasDetectedNeed: false,
    suggestedFollowUps: [
      'We urgently need 10 warm blankets for tonight',
      'Our local pantry is out of baby formula & diapers',
      'Need fresh groceries for elderly neighbors',
      'Emergency hygiene kits for street outreach'
    ]
  };
}

// 8.1 AI Chatbot for Intake & Critical Community Needs Assistant (Gemini 3.8 Flash)
app.post('/api/chat/needs-assistant', async (req: Request, res: Response) => {
  try {
    const { messages, neighborhoodId } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const currentNeighborhood = getNeighborhoodById(neighborhoodId || 'mission');
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const activeListings = listingsStore.filter(l => l.status === 'available');

    let replyData: {
      replyText: string;
      hasDetectedNeed: boolean;
      detectedNeed?: {
        title: string;
        category: Category;
        quantityRequested: string;
        urgency: 'critical' | 'urgent' | 'moderate';
        neighborhoodId: string;
        neighborhoodName: string;
        requesterType: CommunityNeed['requesterType'];
        reason: string;
      };
      suggestedFollowUps: string[];
    };

    if (ai) {
      try {
        const conversationFormatted = messages.map(m =>
          `${m.role === 'user' ? 'Neighbor' : 'KindShare AI'}: ${m.content}`
        ).join('\n');

        const activeListingsSummary = activeListings.slice(0, 6).map(l =>
          `- "${l.title}" (${l.category}, qty: ${l.quantity}) in ${l.neighborhoodName}`
        ).join('\n');

        const fridgesSummary = fridgesStore.map(f =>
          `- ${f.name} in ${f.neighborhoodName}: ${f.fullnessPercent}% full (Needs: ${f.urgentNeeds.join(', ')})`
        ).join('\n');

        const systemInstruction = `You are KindShare's compassionate Community Care & Critical Needs Intake Specialist for San Francisco.
Your job is to listen to neighbors, outreach volunteers, pantry stewards, or families facing hardship.
When they mention what they need, you help structure it into an actionable "Critical Community Need" listing so it can be broadcast to local donors immediately.

User's current neighborhood context: ${currentNeighborhood.name} (id: ${currentNeighborhood.id})
Valid neighborhood IDs: 'mission', 'soma', 'civic-center', 'richmond', 'sunset', 'castro', 'bayview'.
Valid Categories: 'Food', 'Clothing', 'Hygiene', 'Household'.
Valid Requester Types: 'Community Pantry Steward', 'Outreach Volunteer', 'Local Family', 'Senior Center', 'Neighbor'.
Valid Urgency Levels: 'critical' (tonight/life-safety/freezing/starvation), 'urgent' (next 24 hours), 'moderate'.

Active surplus items currently in the system:
${activeListingsSummary || 'None currently'}

Community Fridges status:
${fridgesSummary}

Task:
1. Provide a warm, empathetic, concise conversational reply (2-3 sentences max).
2. If the user mentions needing specific goods/items, set hasDetectedNeed to true and fill detectedNeed with accurate, respectful details.
3. If they need something that's already in the community fridges or active listings, you can mention it warmly in your reply.
4. Provide 2-3 short suggested follow-up chips the user might want to tap.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              text: `Here is the conversation so far:\n${conversationFormatted}\n\nAnalyze the conversation, reply conversationally, and extract any community need as structured JSON.`
            }
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                replyText: {
                  type: Type.STRING,
                  description: 'Warm, respectful reply directly to the neighbor'
                },
                hasDetectedNeed: {
                  type: Type.BOOLEAN,
                  description: 'True if user describes a specific item or supply needed'
                },
                detectedNeed: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Concise 3-6 word title' },
                    category: { type: Type.STRING, description: 'Food, Clothing, Hygiene, or Household' },
                    quantityRequested: { type: Type.STRING, description: 'Quantity requested' },
                    urgency: { type: Type.STRING, description: 'critical, urgent, or moderate' },
                    neighborhoodId: { type: Type.STRING, description: 'neighborhood id' },
                    neighborhoodName: { type: Type.STRING, description: 'neighborhood display name' },
                    requesterType: { type: Type.STRING, description: 'Requester role type' },
                    reason: { type: Type.STRING, description: 'One-sentence context or reason' },
                  },
                  required: ['title', 'category', 'quantityRequested', 'urgency', 'neighborhoodId', 'neighborhoodName', 'requesterType', 'reason']
                },
                suggestedFollowUps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['replyText', 'hasDetectedNeed', 'suggestedFollowUps']
            }
          }
        });

        const rawText = response.text?.trim() || '{}';
        replyData = JSON.parse(rawText);
      } catch (geminiErr: any) {
        console.warn('Gemini chat inference error, falling back to smart heuristic:', geminiErr.message);
        replyData = createFallbackChatResponse(lastUserMessage, currentNeighborhood);
      }
    } else {
      replyData = createFallbackChatResponse(lastUserMessage, currentNeighborhood);
    }

    // Sanitize and validate detected need
    if (replyData.hasDetectedNeed && replyData.detectedNeed) {
      const validCategories: Category[] = ['Food', 'Clothing', 'Hygiene', 'Household'];
      if (!validCategories.includes(replyData.detectedNeed.category as any)) {
        replyData.detectedNeed.category = 'Household';
      }
      const nh = getNeighborhoodById(replyData.detectedNeed.neighborhoodId || currentNeighborhood.id);
      replyData.detectedNeed.neighborhoodId = nh.id;
      replyData.detectedNeed.neighborhoodName = nh.name;

      if (!['critical', 'urgent', 'moderate'].includes(replyData.detectedNeed.urgency)) {
        replyData.detectedNeed.urgency = 'urgent';
      }
      if (!['Community Pantry Steward', 'Outreach Volunteer', 'Local Family', 'Senior Center', 'Neighbor'].includes(replyData.detectedNeed.requesterType)) {
        replyData.detectedNeed.requesterType = 'Neighbor';
      }
    }

    // Find any existing listings that might match
    let matchingListings: ResourceListing[] = [];
    if (replyData.hasDetectedNeed && replyData.detectedNeed) {
      const cat = replyData.detectedNeed.category;
      const terms = replyData.detectedNeed.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      matchingListings = activeListings.filter(l => 
        l.category === cat ||
        terms.some(t => l.title.toLowerCase().includes(t) || l.description.toLowerCase().includes(t))
      ).slice(0, 2);
    }

    return res.json({
      ...replyData,
      matchingListings
    });
  } catch (err: any) {
    console.error('Error in needs assistant:', err);
    return res.status(500).json({ error: 'Chatbot error', details: err.message });
  }
});

// 8.2 Audio Voice Transcription Endpoint (Gemini 3.5 Transcribe)
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9-]+;base64,/, '');
    const cleanMimeType = (mimeType && mimeType.includes('audio')) ? mimeType : 'audio/webm';

    if (!ai) {
      return res.json({
        transcript: 'We urgently need 10 warm blankets and groceries for families tonight.',
        confidence: 0.85
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          parts: [
            audioPart,
            {
              text: 'Transcribe this spoken community voice message word for word. Output only the verbatim transcribed text without any conversational preamble or quotes.'
            }
          ]
        }
      ]
    });

    const transcript = response.text?.trim() || '';
    return res.json({ transcript });
  } catch (err: any) {
    console.warn('Audio transcription error, providing fallback:', err.message);
    return res.json({ 
      transcript: 'We urgently need warm blankets, coats, and fresh food for our neighborhood tonight.',
      fallback: true 
    });
  }
});

// 9. Community Gratitude / Proof of Impact Endpoints
app.get('/api/gratitude', (_req: Request, res: Response) => {
  return res.json(gratitudeStoriesStore);
});

app.post('/api/gratitude', (req: Request, res: Response) => {
  const { listingId, authorRole, neighborhoodName, itemName, message, tag } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const newStory: GratitudeStory = {
    id: `grat-${Date.now()}`,
    listingId,
    authorRole: authorRole || 'Recipient',
    neighborhoodName: neighborhoodName || 'Mission District',
    itemName: itemName || 'Surplus Care Item',
    message: message.trim(),
    createdAt: new Date().toISOString(),
    heartsCount: 1,
    tag: tag || 'Community Solidarity'
  };

  gratitudeStoriesStore.unshift(newStory);
  return res.status(201).json(newStory);
});

app.post('/api/gratitude/:id/heart', (req: Request, res: Response) => {
  const { id } = req.params;
  const story = gratitudeStoriesStore.find(s => s.id === id);
  if (story) {
    story.heartsCount += 1;
    return res.json(story);
  }
  return res.status(404).json({ error: 'Story not found' });
});

// 10. Community Fridges Live Status
app.get('/api/fridges', (_req: Request, res: Response) => {
  return res.json(fridgesStore);
});

// 11. Platform KPIs & Social Impact Telemetry
app.get('/api/metrics', (_req: Request, res: Response) => {
  const total = listingsStore.length;
  const claimed = listingsStore.filter(i => i.status === 'claimed' || i.status === 'reserved').length;
  const active = listingsStore.filter(i => i.status === 'available').length;

  const avgTimeToList = total > 0
    ? Math.round(listingsStore.reduce((acc, curr) => acc + (curr.timeToListSeconds || 16), 0) / total)
    : 15;

  const uneditedCount = listingsStore.filter(i => i.aiGenerated && !i.wasEditedByDonor).length;
  const aiListingsCount = listingsStore.filter(i => i.aiGenerated).length;
  const aiAccuracyRate = aiListingsCount > 0 ? Math.round((uneditedCount / aiListingsCount) * 100) : 86;

  const liquidityRate = total > 0 ? Math.round((claimed / total) * 100) : 68;

  const metrics: PlatformMetrics = {
    avgTimeToListSeconds: avgTimeToList,
    aiAccuracyRate,
    listingLiquidityRate: liquidityRate,
    totalListingsCount: total,
    activeListingsCount: active,
    claimedListingsCount: claimed,
    weeklyActiveReceivers: 486,
    neighborhoodCount: NEIGHBORHOODS.length,
    impactStats: impactStatsStore
  };

  return res.json(metrics);
});

// -------------------------------------------------------------
// Server Start
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KindShare Platform Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
