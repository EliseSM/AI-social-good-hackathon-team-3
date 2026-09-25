import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { claimItem, fetchItem, markPickedUp, renewItem, reportItem } from '../../lib/api'
import type { Item } from '../../types'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Item | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  function load() {
    if (!id) return
    fetchItem(id).then(setItem).catch((err) => setError(err.message))
  }

  useEffect(load, [id])

  async function handleClaim() {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      setItem(await claimItem(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim item')
    } finally {
      setBusy(false)
    }
  }

  async function handlePickedUp() {
    if (!id) return
    setBusy(true)
    try {
      setItem(await markPickedUp(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item')
    } finally {
      setBusy(false)
    }
  }

  async function handleRenew() {
    if (!id) return
    setBusy(true)
    try {
      setItem(await renewItem(id))
      setNotice('Listing renewed for another 30 days.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not renew item')
    } finally {
      setBusy(false)
    }
  }

  async function handleReport() {
    if (!id) return
    setBusy(true)
    try {
      const result = await reportItem(id)
      setNotice(result.hidden ? 'Item reported and hidden pending review.' : 'Item reported. Thank you.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report item')
    } finally {
      setBusy(false)
    }
  }

  if (error && !item) return <p className="error page">{error}</p>
  if (!item) return <p className="page">Loading...</p>

  const isRequest = item.postType === 'request'

  return (
    <div className="page page-narrow item-detail">
      {item.photoUrl ? (
        <img className="item-detail-photo" src={item.photoUrl} alt={item.title} />
      ) : (
        <div className="item-detail-photo item-detail-placeholder">No photo provided</div>
      )}

      <div className="item-detail-badges">
        <span className={`item-card-type-badge ${isRequest ? 'is-request' : 'is-offer'}`}>
          {isRequest ? 'Need' : 'Giveaway'}
        </span>
        {isRequest && item.urgency !== 'normal' && (
          <span className={`item-card-urgency urgency-${item.urgency}`}>
            {item.urgency === 'critical' ? '🚨 Critical need' : '⚠️ Urgent need'}
          </span>
        )}
      </div>

      <h1>{item.title}</h1>
      <p className="item-detail-category">{item.category}</p>
      <p>{item.description}</p>
      <p className="item-status">Status: {item.status.replace('_', ' ')}</p>

      <MapContainer
        center={[item.approxLat, item.approxLng]}
        zoom={13}
        className="item-map"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[item.approxLat, item.approxLng]} />
      </MapContainer>

      {item.exactAddress && (
        <div className="exact-address">
          <strong>{isRequest ? 'Drop-off address:' : 'Pickup address:'}</strong> {item.exactAddress}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <div className="item-actions">
        {item.status === 'available' && !item.isMine && (
          <button disabled={busy} onClick={handleClaim}>
            {isRequest ? 'I can help with this' : 'Claim this item'}
          </button>
        )}
        {(item.isMine || item.isClaimedByMe) && item.status === 'claimed' && (
          <button disabled={busy} onClick={handlePickedUp}>
            {isRequest ? 'Mark as fulfilled' : 'Mark as picked up'}
          </button>
        )}
        {item.isMine && item.status === 'available' && (
          <button disabled={busy} onClick={handleRenew}>
            Renew listing (+30 days)
          </button>
        )}
        {!item.isMine && (
          <button className="link-button" disabled={busy} onClick={handleReport}>
            Report item
          </button>
        )}
      </div>
    </div>
  )
}
