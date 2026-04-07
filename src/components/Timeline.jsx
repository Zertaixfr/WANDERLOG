// Timeline interactive — chronologie visuelle du voyage style Polarsteps
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import PhotoGallery from './PhotoGallery'
import StageWeather from './StageWeather'

const TRANSPORT_ICONS = {
  plane: '\u2708\uFE0F', boat: '\u26F5', car: '\uD83D\uDE97', bus: '\uD83D\uDE8C',
  train: '\uD83D\uDE84', bike: '\uD83D\uDEB2', walk: '\uD83D\uDEB6',
  motorcycle: '\uD83C\uDFCD\uFE0F', hitchhike: '\uD83D\uDC4D', other: '\uD83D\uDEA9',
}

const TRANSPORT_LABELS = {
  plane: 'Avion', boat: 'Bateau', car: 'Voiture', bus: 'Bus',
  train: 'Train', bike: 'V\u00e9lo', walk: '\u00c0 pied',
  motorcycle: 'Moto', hitchhike: 'Auto-stop', other: 'Autre',
}

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Calcul du nombre de jours entre deux dates
const daysBetween = (d1, d2) => {
  if (!d1 || !d2) return null
  return Math.max(1, Math.ceil(Math.abs(new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)))
}

const TimelineCard = ({ trip, index, prevTrip, isLast, posts }) => {
  const [expanded, setExpanded] = useState(false)
  const photos = trip.photos?.length > 0 ? trip.photos : (trip.photoUrl ? [trip.photoUrl] : [])
  const dist = prevTrip ? Math.round(haversineKm(prevTrip.latitude, prevTrip.longitude, trip.latitude, trip.longitude)) : null
  const days = prevTrip ? daysBetween(prevTrip.arrivalDate, trip.arrivalDate) : null

  // Posts liés à cette étape (même pays+ville ou proches en date)
  const relatedPosts = posts.filter((p) => {
    if (p.location && trip.city && p.location.toLowerCase().includes(trip.city.toLowerCase())) return true
    if (p.country && trip.country && p.country.toLowerCase() === trip.country.toLowerCase() && p.location?.toLowerCase().includes(trip.city?.toLowerCase())) return true
    return false
  }).slice(0, 3)

  return (
    <div className="tl-card-wrap">
      {/* Connecteur transport */}
      {prevTrip && (
        <div className="tl-connector">
          <div className="tl-connector-line" />
          <div className="tl-connector-info">
            <span className="tl-connector-emoji">
              {trip.transport ? (TRANSPORT_ICONS[trip.transport] || '\u2708\uFE0F') : '\u2708\uFE0F'}
            </span>
            {dist && <span className="tl-connector-dist">{dist} km</span>}
            {days && <span className="tl-connector-days">{days}j</span>}
          </div>
          <div className="tl-connector-line" />
        </div>
      )}

      {/* Carte étape */}
      <div className={`tl-card ${isLast ? 'tl-card-current' : ''}`} onClick={() => setExpanded(!expanded)}>
        {/* Header */}
        <div className="tl-card-header">
          <div className="tl-card-number">{index + 1}</div>
          <div className="tl-card-title-wrap">
            <h3 className="tl-card-city">{trip.city}</h3>
            {trip.country && <span className="tl-card-country">{trip.country}</span>}
          </div>
          {isLast && <span className="tl-card-live-badge">Maintenant</span>}
          <span className="tl-card-expand">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>

        {/* Date + transport */}
        <div className="tl-card-meta">
          {trip.arrivalDate && (
            <span className="tl-card-date">
              {new Date(trip.arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          {trip.transport && (
            <span className="tl-card-transport">
              {TRANSPORT_ICONS[trip.transport]} {TRANSPORT_LABELS[trip.transport]}
            </span>
          )}
        </div>

        {/* Photo preview (toujours visible si disponible) */}
        {photos.length > 0 && !expanded && (
          <div className="tl-card-photo-preview">
            <img src={photos[0]} alt={trip.city} />
            {photos.length > 1 && <span className="tl-card-photo-count">+{photos.length - 1}</span>}
          </div>
        )}

        {/* Contenu expandé */}
        {expanded && (
          <div className="tl-card-body">
            {trip.notes && <p className="tl-card-notes">{trip.notes}</p>}

            {photos.length > 0 && (
              <div className="tl-card-gallery" onClick={(e) => e.stopPropagation()}>
                <PhotoGallery photos={photos} city={trip.city} />
              </div>
            )}

            <div className="tl-card-weather" onClick={(e) => e.stopPropagation()}>
              <StageWeather latitude={trip.latitude} longitude={trip.longitude} />
            </div>

            {/* Posts liés */}
            {relatedPosts.length > 0 && (
              <div className="tl-card-posts">
                <span className="tl-card-posts-title">Posts depuis {trip.city}</span>
                {relatedPosts.map((p) => (
                  <div key={p.id} className="tl-card-post-item">
                    <span className="tl-card-post-author">{p.authorName}</span>
                    <span className="tl-card-post-text">{p.text?.slice(0, 100)}{p.text?.length > 100 ? '...' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Réactions */}
            {trip.reactions && Object.keys(trip.reactions).length > 0 && (
              <div className="tl-card-reactions">
                {Object.entries(trip.reactions).map(([emoji, users]) => (
                  users.length > 0 && (
                    <span key={emoji} className="reaction-pill">
                      <span>{emoji}</span>
                      <span className="reaction-count">{users.length}</span>
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Timeline = ({ trips = [], posts = [] }) => {
  const { project } = useProject()
  const validTrips = trips.filter(t => t.latitude && t.longitude)

  if (validTrips.length === 0) {
    return (
      <div className="tl-section">
        <h2 className="section-title">Timeline</h2>
        <div className="tl-empty">
          <span>&#128340;</span>
          <p>La timeline apparaîtra dès la première étape ajoutée</p>
        </div>
      </div>
    )
  }

  // Stats globales
  const countries = [...new Set(validTrips.map(t => t.country).filter(Boolean))]
  const totalKm = validTrips.reduce((sum, t, i) => {
    if (i === 0) return 0
    return sum + haversineKm(validTrips[i - 1].latitude, validTrips[i - 1].longitude, t.latitude, t.longitude)
  }, 0)
  const firstDate = validTrips[0]?.arrivalDate
  const lastDate = validTrips[validTrips.length - 1]?.arrivalDate
  const totalDays = daysBetween(firstDate, lastDate) || 0

  return (
    <div className="tl-section">
      <h2 className="section-title">Timeline</h2>
      {project && <p className="section-subtitle">{project.name}</p>}

      {/* Résumé en haut */}
      <div className="tl-summary">
        <div className="tl-summary-item">
          <span className="tl-summary-value">{validTrips.length}</span>
          <span className="tl-summary-label">&eacute;tapes</span>
        </div>
        <div className="tl-summary-sep" />
        <div className="tl-summary-item">
          <span className="tl-summary-value">{countries.length}</span>
          <span className="tl-summary-label">pays</span>
        </div>
        <div className="tl-summary-sep" />
        <div className="tl-summary-item">
          <span className="tl-summary-value">{Math.round(totalKm).toLocaleString('fr-FR')}</span>
          <span className="tl-summary-label">km</span>
        </div>
        <div className="tl-summary-sep" />
        <div className="tl-summary-item">
          <span className="tl-summary-value">{totalDays}</span>
          <span className="tl-summary-label">jours</span>
        </div>
      </div>

      {/* Timeline verticale */}
      <div className="tl-track">
        {validTrips.map((trip, i) => (
          <TimelineCard
            key={trip.id || i}
            trip={trip}
            index={i}
            prevTrip={i > 0 ? validTrips[i - 1] : null}
            isLast={i === validTrips.length - 1}
            posts={posts}
          />
        ))}

        {/* Point final */}
        <div className="tl-end">
          <div className="tl-end-dot" />
          <span className="tl-end-text">L'aventure continue...</span>
        </div>
      </div>
    </div>
  )
}

export default Timeline
