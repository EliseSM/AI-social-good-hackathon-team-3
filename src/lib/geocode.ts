export interface GeocodeSuggestion {
  displayName: string
  lat: number
  lng: number
}

let lastRequestAt = 0

export async function searchAddress(query: string): Promise<GeocodeSuggestion[]> {
  if (query.trim().length < 3) return []

  const wait = Math.max(0, 1000 - (Date.now() - lastRequestAt))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestAt = Date.now()

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) return []
  const results: Array<{ display_name: string; lat: string; lon: string }> = await res.json()
  return results.map((r) => ({
    displayName: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
}
