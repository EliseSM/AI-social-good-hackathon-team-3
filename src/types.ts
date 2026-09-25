export type Category =
  | 'furniture'
  | 'clothing'
  | 'electronics'
  | 'books'
  | 'household'
  | 'toys'
  | 'other'

export type ItemStatus = 'available' | 'claimed' | 'picked_up' | 'hidden'

export type PostType = 'offer' | 'request'
export type Urgency = 'normal' | 'urgent' | 'critical'

export interface Item {
  id: string
  postType: PostType
  urgency: Urgency
  title: string
  description: string
  category: Category
  photoUrl: string | null
  status: ItemStatus
  approxLat: number
  approxLng: number
  createdAt: string
  expiresAt: string
  isMine: boolean
  isClaimedByMe: boolean
  exactLat?: number
  exactLng?: number
  exactAddress?: string
}

export interface VisionAnalysis {
  configured: boolean
  labels?: string[]
  suggestedTitle?: string
  suggestedCategory?: Category
  suggestedDescription?: string
  moderation?: { flagged: boolean; reasons: string[] }
}
