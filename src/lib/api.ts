import { getAnonSessionId } from './anonSession'
import type { Item, Category, PostType, Urgency, VisionAnalysis } from '../types'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'x-anon-session': getAnonSessionId(),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export function fetchCategories(): Promise<Category[]> {
  return request('/categories')
}

export function fetchPostTypes(): Promise<PostType[]> {
  return request('/post-types')
}

export function fetchUrgencyLevels(): Promise<Urgency[]> {
  return request('/urgency-levels')
}

export function fetchItems(
  params: { category?: string; search?: string; type?: PostType } = {}
): Promise<Item[]> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.search) qs.set('search', params.search)
  if (params.type) qs.set('type', params.type)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/items${suffix}`)
}

export function fetchUrgentNeeds(): Promise<Item[]> {
  return request('/items/urgent')
}

export function fetchItem(id: string): Promise<Item> {
  return request(`/items/${id}`)
}

export function createItem(form: {
  title: string
  description: string
  category: Category
  address: string
  postType: PostType
  urgency: Urgency
  photo?: File | null
}): Promise<Item> {
  const body = new FormData()
  body.set('title', form.title)
  body.set('description', form.description)
  body.set('category', form.category)
  body.set('address', form.address)
  body.set('postType', form.postType)
  body.set('urgency', form.urgency)
  if (form.photo) body.set('photo', form.photo)
  return request('/items', { method: 'POST', body })
}

export function claimItem(id: string): Promise<Item> {
  return request(`/items/${id}/claim`, { method: 'POST' })
}

export function markPickedUp(id: string): Promise<Item> {
  return request(`/items/${id}/picked-up`, { method: 'POST' })
}

export function renewItem(id: string): Promise<Item> {
  return request(`/items/${id}/renew`, { method: 'POST' })
}

export function reportItem(id: string): Promise<{ ok: boolean; hidden: boolean }> {
  return request(`/items/${id}/report`, { method: 'POST' })
}

export function fetchMyPosts(): Promise<Item[]> {
  return request('/mine/posts')
}

export function fetchMyClaims(): Promise<Item[]> {
  return request('/mine/claims')
}

export function fetchVisionStatus(): Promise<{ configured: boolean }> {
  return request('/vision/status')
}

export function analyzePhoto(photo: File): Promise<VisionAnalysis> {
  const body = new FormData()
  body.set('photo', photo)
  return request('/vision/analyze', { method: 'POST', body })
}
