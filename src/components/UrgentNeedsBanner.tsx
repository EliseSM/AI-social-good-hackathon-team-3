import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUrgentNeeds } from '../lib/api'
import type { Item } from '../types'

const POLL_MS = 30_000

export default function UrgentNeedsBanner() {
  const [needs, setNeeds] = useState<Item[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function load() {
      fetchUrgentNeeds().then(setNeeds).catch(() => {})
    }
    load()
    const handle = setInterval(load, POLL_MS)
    return () => clearInterval(handle)
  }, [])

  if (!needs.length || dismissed) return null

  const hasCritical = needs.some((n) => n.urgency === 'critical')

  return (
    <div className={`urgent-banner ${hasCritical ? 'urgent-banner-critical' : 'urgent-banner-urgent'}`}>
      <span className="urgent-banner-label">
        {hasCritical ? '🚨 Critical needs nearby' : '⚠️ Urgent needs nearby'}
      </span>
      <div className="urgent-banner-scroll">
        {needs.map((item) => (
          <Link key={item.id} to={`/items/${item.id}`} className="urgent-banner-item">
            <span className={`urgency-dot urgency-${item.urgency}`} />
            {item.title}
          </Link>
        ))}
      </div>
      <button
        className="urgent-banner-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
