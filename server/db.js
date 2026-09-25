import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'data.db'))

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS anon_sessions (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    owner_session_id TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'offer',
    urgency TEXT NOT NULL DEFAULT 'normal',
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    approx_lat REAL NOT NULL,
    approx_lng REAL NOT NULL,
    exact_lat REAL NOT NULL,
    exact_lng REAL NOT NULL,
    exact_address TEXT NOT NULL,
    report_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE REFERENCES items(id),
    claimant_session_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL
  );
`)

// Migrate items created before post_type/urgency existed (ALTER TABLE ADD COLUMN
// is a no-op via CREATE TABLE IF NOT EXISTS once the table already exists).
const existingColumns = db.prepare('PRAGMA table_info(items)').all().map((c) => c.name)
if (!existingColumns.includes('post_type')) {
  db.exec("ALTER TABLE items ADD COLUMN post_type TEXT NOT NULL DEFAULT 'offer'")
}
if (!existingColumns.includes('urgency')) {
  db.exec("ALTER TABLE items ADD COLUMN urgency TEXT NOT NULL DEFAULT 'normal'")
}

export function ensureSession(id) {
  const existing = db.prepare('SELECT id FROM anon_sessions WHERE id = ?').get(id)
  if (!existing) {
    db.prepare('INSERT INTO anon_sessions (id, created_at) VALUES (?, ?)').run(
      id,
      new Date().toISOString()
    )
  }
}

export default db
