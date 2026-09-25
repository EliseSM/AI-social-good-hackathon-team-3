import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import db, { ensureSession } from './db.js'
import { analyzeImageBuffer, checkModeration, suggestCategory, visionConfigured } from './vision.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, 'uploads')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10)
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
})

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

const CATEGORIES = ['furniture', 'clothing', 'electronics', 'books', 'household', 'toys', 'other']
const POST_TYPES = ['offer', 'request']
const URGENCY_LEVELS = ['normal', 'urgent', 'critical']
const REPORT_HIDE_THRESHOLD = 3
const ITEM_LIFETIME_DAYS = 30

app.use((req, res, next) => {
  const sessionId = req.header('x-anon-session')
  if (sessionId) {
    ensureSession(sessionId)
    req.sessionId = sessionId
  }
  next()
})

function jitter(lat, lng) {
  const metersOffset = 100 + Math.random() * 200
  const angle = Math.random() * 2 * Math.PI
  const dLat = (metersOffset * Math.cos(angle)) / 111_320
  const dLng =
    (metersOffset * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: lng + dLng }
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GiveShare-Hackathon-App/0.1 (local dev)' },
  })
  if (!res.ok) throw new Error('Geocoding request failed')
  const results = await res.json()
  if (!results.length) throw new Error('Address not found')
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) }
}

function publicItem(row, sessionId) {
  const isOwner = sessionId && row.owner_session_id === sessionId
  const claim = db.prepare('SELECT * FROM claims WHERE item_id = ?').get(row.id)
  const isClaimant = sessionId && claim && claim.claimant_session_id === sessionId
  const base = {
    id: row.id,
    postType: row.post_type,
    urgency: row.urgency,
    title: row.title,
    description: row.description,
    category: row.category,
    photoUrl: row.photo_url,
    status: row.status,
    approxLat: row.approx_lat,
    approxLng: row.approx_lng,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isMine: Boolean(isOwner),
    isClaimedByMe: Boolean(isClaimant),
  }
  if (isOwner || isClaimant) {
    return {
      ...base,
      exactLat: row.exact_lat,
      exactLng: row.exact_lng,
      exactAddress: row.exact_address,
    }
  }
  return base
}

app.get('/api/categories', (_req, res) => res.json(CATEGORIES))

app.get('/api/post-types', (_req, res) => res.json(POST_TYPES))
app.get('/api/urgency-levels', (_req, res) => res.json(URGENCY_LEVELS))

app.get('/api/vision/status', (_req, res) => {
  res.json({ configured: visionConfigured() })
})

app.post('/api/vision/analyze', uploadMemory.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo provided' })
  if (!visionConfigured()) {
    return res.json({ configured: false })
  }
  try {
    const result = await analyzeImageBuffer(req.file.buffer)
    const labels = (result.labelAnnotations || []).map((l) => l.description)
    const moderation = checkModeration(result.safeSearchAnnotation)
    res.json({
      configured: true,
      labels,
      suggestedTitle: labels[0] || '',
      suggestedCategory: suggestCategory(labels),
      suggestedDescription: labels.slice(0, 5).join(', '),
      moderation,
    })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Vision analysis failed' })
  }
})

const URGENCY_RANK = "CASE urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END"

app.get('/api/items', (req, res) => {
  const { category, search, type } = req.query
  const now = new Date().toISOString()
  let query = 'SELECT * FROM items WHERE status = ? AND expires_at > ?'
  const params = ['available', now]
  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }
  if (type && POST_TYPES.includes(type)) {
    query += ' AND post_type = ?'
    params.push(type)
  }
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  query += ` ORDER BY ${URGENCY_RANK} ASC, created_at DESC`
  const rows = db.prepare(query).all(...params)
  res.json(rows.map((row) => publicItem(row, req.sessionId)))
})

app.get('/api/items/urgent', (req, res) => {
  const now = new Date().toISOString()
  const rows = db
    .prepare(
      `SELECT * FROM items
       WHERE status = 'available' AND expires_at > ? AND post_type = 'request'
         AND urgency IN ('urgent', 'critical')
       ORDER BY ${URGENCY_RANK} ASC, created_at DESC
       LIMIT 20`
    )
    .all(now)
  res.json(rows.map((row) => publicItem(row, req.sessionId)))
})

app.get('/api/items/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Item not found' })
  res.json(publicItem(row, req.sessionId))
})

app.post('/api/items', upload.single('photo'), async (req, res) => {
  if (!req.sessionId) return res.status(400).json({ error: 'Missing x-anon-session header' })
  const { title, description, category, address } = req.body
  const postType = req.body.postType || 'offer'
  const urgency = postType === 'request' ? req.body.urgency || 'normal' : 'normal'
  if (!title || !category || !address) {
    return res.status(400).json({ error: 'title, category, and address are required' })
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' })
  }
  if (!POST_TYPES.includes(postType)) {
    return res.status(400).json({ error: 'Invalid postType' })
  }
  if (!URGENCY_LEVELS.includes(urgency)) {
    return res.status(400).json({ error: 'Invalid urgency' })
  }
  try {
    if (req.file && visionConfigured()) {
      try {
        const buffer = fs.readFileSync(req.file.path)
        const result = await analyzeImageBuffer(buffer)
        const moderation = checkModeration(result.safeSearchAnnotation)
        if (moderation.flagged) {
          fs.unlinkSync(req.file.path)
          return res.status(400).json({
            error: `Photo flagged as inappropriate (${moderation.reasons.join(', ')}) and cannot be used.`,
          })
        }
      } catch (visionErr) {
        // Vision being unavailable shouldn't block posting; moderation is a bonus, not a gate.
        console.warn('Vision moderation check failed, allowing photo anyway:', visionErr.message)
      }
    }

    const { lat, lng } = await geocodeAddress(address)
    const approx = jitter(lat, lng)
    const id = crypto.randomUUID()
    const now = new Date()
    const expires = new Date(now.getTime() + ITEM_LIFETIME_DAYS * 24 * 60 * 60 * 1000)
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null

    db.prepare(
      `INSERT INTO items
        (id, owner_session_id, post_type, urgency, title, description, category, photo_url, status,
         approx_lat, approx_lng, exact_lat, exact_lng, exact_address,
         report_count, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      id,
      req.sessionId,
      postType,
      urgency,
      title,
      description || '',
      category,
      photoUrl,
      approx.lat,
      approx.lng,
      lat,
      lng,
      address,
      now.toISOString(),
      expires.toISOString()
    )

    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id)
    res.status(201).json(publicItem(row, req.sessionId))
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create item' })
  }
})

app.post('/api/items/:id/claim', (req, res) => {
  if (!req.sessionId) return res.status(400).json({ error: 'Missing x-anon-session header' })
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Item not found' })
  if (row.status !== 'available') {
    return res.status(409).json({ error: 'Item is no longer available' })
  }
  try {
    const claimId = crypto.randomUUID()
    const txn = db.transaction(() => {
      db.prepare(
        'INSERT INTO claims (id, item_id, claimant_session_id, claimed_at) VALUES (?, ?, ?, ?)'
      ).run(claimId, row.id, req.sessionId, new Date().toISOString())
      db.prepare("UPDATE items SET status = 'claimed' WHERE id = ?").run(row.id)
    })
    txn()
    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(row.id)
    res.json(publicItem(updated, req.sessionId))
  } catch (err) {
    // UNIQUE constraint on claims.item_id -> someone else claimed it first
    res.status(409).json({ error: 'Item was just claimed by someone else' })
  }
})

app.post('/api/items/:id/picked-up', (req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Item not found' })
  const claim = db.prepare('SELECT * FROM claims WHERE item_id = ?').get(row.id)
  const isOwner = req.sessionId === row.owner_session_id
  const isClaimant = claim && req.sessionId === claim.claimant_session_id
  if (!isOwner && !isClaimant) return res.status(403).json({ error: 'Not authorized' })
  db.prepare("UPDATE items SET status = 'picked_up' WHERE id = ?").run(row.id)
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(row.id)
  res.json(publicItem(updated, req.sessionId))
})

app.post('/api/items/:id/renew', (req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Item not found' })
  if (req.sessionId !== row.owner_session_id) return res.status(403).json({ error: 'Not authorized' })
  const expires = new Date(Date.now() + ITEM_LIFETIME_DAYS * 24 * 60 * 60 * 1000)
  db.prepare('UPDATE items SET expires_at = ? WHERE id = ?').run(expires.toISOString(), row.id)
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(row.id)
  res.json(publicItem(updated, req.sessionId))
})

app.post('/api/items/:id/report', (req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Item not found' })
  const newCount = row.report_count + 1
  const status = newCount >= REPORT_HIDE_THRESHOLD ? 'hidden' : row.status
  db.prepare('UPDATE items SET report_count = ?, status = ? WHERE id = ?').run(
    newCount,
    status,
    row.id
  )
  res.json({ ok: true, hidden: status === 'hidden' })
})

app.get('/api/mine/posts', (req, res) => {
  if (!req.sessionId) return res.status(400).json({ error: 'Missing x-anon-session header' })
  const rows = db
    .prepare('SELECT * FROM items WHERE owner_session_id = ? ORDER BY created_at DESC')
    .all(req.sessionId)
  res.json(rows.map((row) => publicItem(row, req.sessionId)))
})

app.get('/api/mine/claims', (req, res) => {
  if (!req.sessionId) return res.status(400).json({ error: 'Missing x-anon-session header' })
  const rows = db
    .prepare(
      `SELECT items.* FROM items
       JOIN claims ON claims.item_id = items.id
       WHERE claims.claimant_session_id = ?
       ORDER BY claims.claimed_at DESC`
    )
    .all(req.sessionId)
  res.json(rows.map((row) => publicItem(row, req.sessionId)))
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`GiveShare API listening on http://localhost:${PORT}`))
