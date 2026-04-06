// Barre de recherche — filtre posts et étapes en temps réel
import { useState, useRef, useEffect } from 'react'

const SearchBar = ({ posts = [], trips = [], onResultClick }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  const trimmed = query.trim().toLowerCase()

  // Résultats filtrés
  const results = trimmed.length < 2 ? [] : [
    ...trips
      .filter((t) => t.latitude && t.longitude)
      .filter((t) =>
        (t.city || '').toLowerCase().includes(trimmed) ||
        (t.country || '').toLowerCase().includes(trimmed) ||
        (t.notes || '').toLowerCase().includes(trimmed)
      )
      .map((t) => ({ type: 'trip', id: t.id, title: t.city, subtitle: t.country, date: t.arrivalDate, transport: t.transport, data: t })),
    ...posts
      .filter((p) =>
        (p.text || '').toLowerCase().includes(trimmed) ||
        (p.location || '').toLowerCase().includes(trimmed) ||
        (p.country || '').toLowerCase().includes(trimmed) ||
        (p.authorName || '').toLowerCase().includes(trimmed)
      )
      .map((p) => ({ type: 'post', id: p.id, title: p.location || p.authorName || 'Post', subtitle: p.text?.slice(0, 80), date: null, data: p })),
  ].slice(0, 10)

  // Fermer en cliquant dehors
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleSelect = (result) => {
    setIsOpen(false)
    setQuery('')
    if (onResultClick) onResultClick(result)
  }

  const TRANSPORT_ICONS = {
    plane: '\u2708\uFE0F', boat: '\u26F5', car: '\uD83D\uDE97', bus: '\uD83D\uDE8C',
    train: '\uD83D\uDE84', bike: '\uD83D\uDEB2', walk: '\uD83D\uDEB6',
    motorcycle: '\uD83C\uDFCD\uFE0F', hitchhike: '\uD83D\uDC4D', other: '\uD83D\uDEA9',
  }

  return (
    <div className="search-bar-wrap" ref={wrapRef}>
      <div className="search-input-wrap">
        <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Rechercher une ville, un pays, un post..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }}>
            &times;
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-results">
          {results.map((r) => (
            <button key={`${r.type}-${r.id}`} className="search-result-item" onClick={() => handleSelect(r)}>
              <span className="search-result-icon">
                {r.type === 'trip' ? (r.transport ? TRANSPORT_ICONS[r.transport] || '\uD83D\uDCCD' : '\uD83D\uDCCD') : '\uD83D\uDCDD'}
              </span>
              <div className="search-result-text">
                <span className="search-result-title">{r.title}</span>
                {r.subtitle && <span className="search-result-sub">{r.subtitle}</span>}
              </div>
              <span className="search-result-type">{r.type === 'trip' ? '\u00C9tape' : 'Post'}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && trimmed.length >= 2 && results.length === 0 && (
        <div className="search-results">
          <div className="search-no-results">Aucun r&eacute;sultat pour &laquo; {trimmed} &raquo;</div>
        </div>
      )}
    </div>
  )
}

export default SearchBar
