# GiveShare

Post items you want to give away, or items/needs you're requesting — each with a pickup/drop-off location on a map. Others can browse, search, and claim or fulfill them. Urgent and critical needs surface in a sticky banner across the whole app.

See [PLANNING.md](./PLANNING.md) for the full design/architecture doc.

## Stack

- **Frontend:** React + TypeScript + Vite, `react-leaflet`/Leaflet + OpenStreetMap for the map (no API key needed).
- **Backend:** Local Express API + SQLite (`server/`) — a real persistent database, no external account required. Swappable for Supabase later without changing the frontend contract much.
- **Accounts:** Anonymous-first. Each browser gets a persistent random ID (`localStorage`) used to track "my posts"/"my claims." Real sign-in is a planned future addition.
- **Photo intelligence (optional):** Google Cloud Vision API suggests a title/category/description from an uploaded photo and blocks flagged content. See the Vision API section below to enable it.

## Offers vs. needs

- Every post is either a **giveaway** (offer) or a **need** (request), toggled at the top of the post form or via the "Give an item" / "Request an item" nav links.
- Needs carry a self-declared urgency: normal, urgent, or critical.
- Any `urgent`/`critical` need shows up in a dismissible banner below the navbar on every page, and as a colored map pin (green = giveaway, blue = normal need, orange = urgent, red = critical).
- Claiming an offer means "I'll pick this up"; claiming a request means "I can help with this" — same underlying first-come-first-served mechanism either way.

## Running locally

Two servers need to run at once: the API (port 4000) and the Vite dev server (port 5173, which proxies `/api` and `/uploads` to the API).

```bash
# one-time setup
npm install
npm --prefix server install

# every time, in one command (uses `concurrently`)
npm run dev:all
```

Or run them in two separate terminals:

```bash
npm run server   # starts the API on http://localhost:4000
npm run dev      # starts the web app on http://localhost:5173
```

Open http://localhost:5173.

The SQLite database file (`server/data.db`) and uploaded photos (`server/uploads/`) persist across restarts and are gitignored.

## How claiming/privacy works

- Every item has an approximate (public) pin and an exact (private) address.
- The map/list only ever show the approximate pin.
- Claiming an item is first-come-first-served (enforced by a DB unique constraint) and reveals the exact address to the claimant only.

## Vision API (optional photo suggestions + moderation)

Uploading a photo can auto-suggest a title/category/description and block inappropriate images, via Google Cloud Vision. The app works fully without this configured — it's a bonus, not a requirement.

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com) and enable billing (Vision API's free tier covers normal hackathon usage).
2. **APIs & Services → Library** → search "Cloud Vision API" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → API key**. Restrict it to "Cloud Vision API" only.
4. Copy `server/.env.example` to `server/.env` and paste in the key:
   ```
   GOOGLE_VISION_API_KEY=your-key-here
   ```
5. Restart the API server (`npm run dev:all`) to pick it up.
