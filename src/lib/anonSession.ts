const STORAGE_KEY = 'giveshare_anon_session_id'

export function getAnonSessionId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
