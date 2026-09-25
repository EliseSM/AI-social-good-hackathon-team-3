import 'dotenv/config'

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

const CATEGORY_KEYWORDS = {
  furniture: ['furniture', 'chair', 'table', 'sofa', 'couch', 'desk', 'shelf', 'bookcase', 'cabinet', 'bed', 'dresser', 'stool'],
  clothing: ['clothing', 'shirt', 't-shirt', 'jacket', 'coat', 'pants', 'jeans', 'dress', 'shoe', 'footwear', 'sweater', 'apparel'],
  electronics: ['electronics', 'computer', 'laptop', 'mobile phone', 'telephone', 'television', 'monitor', 'camera', 'speaker', 'gadget', 'appliance'],
  books: ['book', 'novel', 'publication', 'textbook', 'magazine'],
  toys: ['toy', 'plush', 'action figure', 'doll', 'board game', 'lego'],
  household: ['kitchenware', 'cookware', 'tableware', 'home appliance', 'dishware', 'décor', 'decor', 'lamp', 'tool', 'houseware'],
}

const UNSAFE_LIKELIHOODS = new Set(['LIKELY', 'VERY_LIKELY'])

export function visionConfigured() {
  return Boolean(process.env.GOOGLE_VISION_API_KEY)
}

export async function analyzeImageBuffer(buffer) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) return null

  const body = {
    requests: [
      {
        image: { content: buffer.toString('base64') },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'SAFE_SEARCH_DETECTION' },
        ],
      },
    ],
  }

  const res = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Vision API request failed: ${res.status}`)
  }
  const data = await res.json()
  const result = data.responses?.[0] || {}
  if (result.error) throw new Error(result.error.message || 'Vision API error')
  return result
}

export function suggestCategory(labels) {
  const lowerLabels = labels.map((l) => l.toLowerCase())
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lowerLabels.some((label) => keywords.some((kw) => label.includes(kw)))) {
      return category
    }
  }
  return 'other'
}

export function checkModeration(safeSearchAnnotation) {
  if (!safeSearchAnnotation) return { flagged: false, reasons: [] }
  const reasons = []
  if (UNSAFE_LIKELIHOODS.has(safeSearchAnnotation.adult)) reasons.push('adult content')
  if (UNSAFE_LIKELIHOODS.has(safeSearchAnnotation.violence)) reasons.push('violent content')
  if (UNSAFE_LIKELIHOODS.has(safeSearchAnnotation.racy)) reasons.push('racy content')
  return { flagged: reasons.length > 0, reasons }
}
