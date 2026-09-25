import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { fetchCategories, fetchItems } from '../../lib/api'
import type { Category, Item, PostType } from '../../types'
import ItemCard from '../../components/ItemCard'

type ViewMode = 'list' | 'map'
type TypeFilter = 'all' | PostType

function markerIcon(item: Item) {
  let colorClass = 'map-marker-offer'
  if (item.postType === 'request') {
    colorClass =
      item.urgency === 'critical'
        ? 'map-marker-critical'
        : item.urgency === 'urgent'
          ? 'map-marker-urgent'
          : 'map-marker-request'
  }
  return L.divIcon({ className: `map-marker ${colorClass}`, iconSize: [18, 18] })
}

export default function BrowsePage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchItems({
      category: category || undefined,
      search: search || undefined,
      type: typeFilter === 'all' ? undefined : typeFilter,
    })
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [category, search, typeFilter])

  const mapCenter = useMemo<[number, number]>(() => {
    if (items.length) return [items[0].approxLat, items[0].approxLng]
    return [39.8283, -98.5795] // continental US fallback
  }, [items])

  return (
    <div className="page">
      <div className="browse-controls">
        <input
          type="search"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="view-toggle">
          <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>
            All
          </button>
          <button className={typeFilter === 'offer' ? 'active' : ''} onClick={() => setTypeFilter('offer')}>
            Giveaways
          </button>
          <button className={typeFilter === 'request' ? 'active' : ''} onClick={() => setTypeFilter('request')}>
            Needs
          </button>
        </div>
        <div className="view-toggle">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            List
          </button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>
            Map
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !items.length && (
        <p>Nothing here yet. Be the first to give something away or post a need!</p>
      )}

      {!loading && view === 'list' && (
        <div className="item-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {!loading && view === 'map' && (
        <MapContainer center={mapCenter} zoom={items.length ? 12 : 4} className="browse-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {items.map((item) => (
            <Marker key={item.id} position={[item.approxLat, item.approxLng]} icon={markerIcon(item)}>
              <Popup>
                <strong>{item.title}</strong>
                <br />
                {item.postType === 'request' ? 'Need' : 'Giveaway'} · {item.category}
                <br />
                <Link to={`/items/${item.id}`}>View item</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  )
}
