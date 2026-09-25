import { useEffect, useState } from 'react'
import { fetchMyClaims, fetchMyPosts } from '../../lib/api'
import type { Item } from '../../types'
import ItemCard from '../../components/ItemCard'

export default function MyStuffPage() {
  const [posts, setPosts] = useState<Item[]>([])
  const [claims, setClaims] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchMyPosts(), fetchMyClaims()])
      .then(([p, c]) => {
        setPosts(p)
        setClaims(c)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="page">Loading...</p>

  return (
    <div className="page">
      <p className="hint">
        This list is tied to this browser. Since there's no sign-in yet, posting or claiming from a
        different device or browser won't show up here.
      </p>

      <h2>My posted items</h2>
      {posts.length ? (
        <div className="item-grid">
          {posts.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p>You haven't posted anything yet.</p>
      )}

      <h2>My claimed items</h2>
      {claims.length ? (
        <div className="item-grid">
          {claims.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p>You haven't claimed anything yet.</p>
      )}
    </div>
  )
}
