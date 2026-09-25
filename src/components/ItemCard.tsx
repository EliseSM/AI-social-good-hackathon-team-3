import { Link } from 'react-router-dom'
import type { Item } from '../types'

const CATEGORY_EMOJI: Record<string, string> = {
  furniture: '🛋️',
  clothing: '👕',
  electronics: '🔌',
  books: '📚',
  household: '🏠',
  toys: '🧸',
  other: '📦',
}

const URGENCY_LABEL: Record<string, string> = {
  critical: '🚨 Critical need',
  urgent: '⚠️ Urgent need',
}

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Link to={`/items/${item.id}`} className="item-card">
      <div className="item-card-photo">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.title} />
        ) : (
          <div className="item-card-placeholder">{CATEGORY_EMOJI[item.category] || '📦'}</div>
        )}
        <span className={`item-card-type-badge ${item.postType === 'request' ? 'is-request' : 'is-offer'}`}>
          {item.postType === 'request' ? 'Need' : 'Giveaway'}
        </span>
        {item.status !== 'available' && (
          <span className="item-card-badge">{item.status.replace('_', ' ')}</span>
        )}
      </div>
      <div className="item-card-body">
        {item.postType === 'request' && item.urgency !== 'normal' && (
          <p className={`item-card-urgency urgency-${item.urgency}`}>{URGENCY_LABEL[item.urgency]}</p>
        )}
        <h3>{item.title}</h3>
        <p className="item-card-category">
          {CATEGORY_EMOJI[item.category] || '📦'} {item.category}
        </p>
      </div>
    </Link>
  )
}
