import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { analyzePhoto, createItem, fetchCategories, fetchVisionStatus } from '../../lib/api'
import { searchAddress, type GeocodeSuggestion } from '../../lib/geocode'
import type { Category, PostType, Urgency, VisionAnalysis } from '../../types'

export default function PostItemPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [postType, setPostType] = useState<PostType>(
    searchParams.get('type') === 'request' ? 'request' : 'offer'
  )
  const [urgency, setUrgency] = useState<Urgency>('normal')
  const [categories, setCategories] = useState<Category[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [visionEnabled, setVisionEnabled] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null)
  const [photoBlocked, setPhotoBlocked] = useState('')

  const isRequest = postType === 'request'

  useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats)
      setCategory(cats[0] ?? '')
    })
    fetchVisionStatus()
      .then((s) => setVisionEnabled(s.configured))
      .catch(() => setVisionEnabled(false))
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (address.trim().length >= 3) {
        searchAddress(address).then(setSuggestions).catch(() => setSuggestions([]))
      } else {
        setSuggestions([])
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [address])

  async function handlePhotoChange(file: File | null) {
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
    setAnalysis(null)
    setPhotoBlocked('')

    if (!file || !visionEnabled) return

    setAnalyzing(true)
    try {
      const result = await analyzePhoto(file)
      if (result.moderation?.flagged) {
        setPhotoBlocked(
          `This photo was flagged (${result.moderation.reasons.join(', ')}) and can't be used. Please choose a different photo.`
        )
        setPhoto(null)
        setPhotoPreview(null)
        setAnalysis(null)
      } else {
        setAnalysis(result)
      }
    } catch {
      // Vision being unreachable shouldn't block posting a photo.
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!category) return
    setSubmitting(true)
    setError('')
    try {
      const item = await createItem({
        title,
        description,
        category,
        address,
        postType,
        urgency: isRequest ? urgency : 'normal',
        photo,
      })
      navigate(`/items/${item.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-narrow">
      <h1>{isRequest ? 'Request an item' : 'Give an item'}</h1>

      <div className="post-type-toggle">
        <button
          type="button"
          className={!isRequest ? 'active' : ''}
          onClick={() => setPostType('offer')}
        >
          🎁 I want to give something away
        </button>
        <button
          type="button"
          className={isRequest ? 'active' : ''}
          onClick={() => setPostType('request')}
        >
          🙏 I need something
        </button>
      </div>

      <form onSubmit={handleSubmit} className="post-form">
        <section className="photo-prompt">
          <label className="photo-drop">
            {photoPreview ? (
              <img src={photoPreview} alt="Selected item" />
            ) : (
              <span>
                📷 Add a photo (optional
                {isRequest ? ' — a reference photo of what you need' : ', but it helps items get claimed faster'})
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {photo && (
            <button type="button" className="link-button" onClick={() => handlePhotoChange(null)}>
              Remove photo
            </button>
          )}
          {analyzing && <p className="hint">Analyzing photo...</p>}
          {photoBlocked && <p className="error">{photoBlocked}</p>}

          {analysis && !analysis.moderation?.flagged && (
            <div className="vision-suggestions">
              <p className="hint">Suggestions from your photo:</p>
              <div className="suggestion-chips">
                {analysis.suggestedTitle && (
                  <button type="button" onClick={() => setTitle(analysis.suggestedTitle!)}>
                    Use title: "{analysis.suggestedTitle}"
                  </button>
                )}
                {analysis.suggestedCategory && (
                  <button type="button" onClick={() => setCategory(analysis.suggestedCategory!)}>
                    Use category: {analysis.suggestedCategory}
                  </button>
                )}
                {analysis.suggestedDescription && (
                  <button
                    type="button"
                    onClick={() => setDescription(analysis.suggestedDescription!)}
                  >
                    Use description
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={500}
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} required>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {isRequest && (
          <label>
            How urgent is this need?
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        )}

        <label>
          {isRequest ? 'Drop-off address' : 'Pickup address'}
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, state"
            required
          />
        </label>
        {suggestions.length > 0 && (
          <ul className="address-suggestions">
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => { setAddress(s.displayName); setSuggestions([]) }}>
                {s.displayName}
              </li>
            ))}
          </ul>
        )}
        <p className="hint">
          Your exact address is only shown to whoever {isRequest ? 'offers to help with' : 'claims'} this
          post. Everyone else sees an approximate pin.
        </p>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting || Boolean(photoBlocked)}>
          {submitting ? 'Posting...' : isRequest ? 'Post request' : 'Post giveaway'}
        </button>
      </form>
    </div>
  )
}
