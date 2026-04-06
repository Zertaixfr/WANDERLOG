// Profil voyageur — panneau latéral avec infos du projet
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import PhotoGallery from './PhotoGallery'

// Distance haversine
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TRANSPORT_ICONS = {
  plane: '\u2708\uFE0F',
  boat: '\u26F5',
  car: '\uD83D\uDE97',
  bus: '\uD83D\uDE8C',
  train: '\uD83D\uDE84',
  bike: '\uD83D\uDEB2',
  walk: '\uD83D\uDEB6',
  motorcycle: '\uD83C\uDFCD\uFE0F',
  hitchhike: '\uD83D\uDC4D',
  other: '\uD83D\uDEA9',
}

const TRANSPORT_LABELS = {
  plane: 'Avion',
  boat: 'Bateau',
  car: 'Voiture',
  bus: 'Bus',
  train: 'Train',
  bike: 'V\u00e9lo',
  walk: '\u00c0 pied',
  motorcycle: 'Moto',
  hitchhike: 'Auto-stop',
  other: 'Autre',
}

const REACTION_EMOJIS = ['\uD83D\uDE0D', '\uD83D\uDD25', '\uD83C\uDF0D', '\uD83D\uDE4C', '\u2764\uFE0F', '\uD83E\uDD29']

// Composant réactions pour une étape
const TripReactions = ({ trip }) => {
  const { user, demoMode } = useAuth()
  const { project } = useProject()
  const [showPicker, setShowPicker] = useState(false)

  const reactions = trip.reactions || {}
  const totalReactions = Object.values(reactions).reduce((sum, users) => sum + users.length, 0)

  const handleReaction = async (emoji) => {
    if (!user || demoMode) return
    setShowPicker(false)
    const { toggleTripReaction } = await import('../services/projectService')
    await toggleTripReaction(project.id, trip.id, user.uid, emoji)
  }

  const hasUserReacted = (emoji) => {
    return reactions[emoji]?.includes(user?.uid)
  }

  return (
    <div className="trip-reactions">
      {/* Réactions existantes */}
      <div className="reactions-list">
        {Object.entries(reactions).map(([emoji, users]) => (
          users.length > 0 && (
            <button
              key={emoji}
              className={`reaction-pill ${hasUserReacted(emoji) ? 'reaction-mine' : ''}`}
              onClick={() => handleReaction(emoji)}
              title={`${users.length} réaction${users.length > 1 ? 's' : ''}`}
            >
              <span>{emoji}</span>
              <span className="reaction-count">{users.length}</span>
            </button>
          )
        ))}

        {/* Bouton ajouter réaction */}
        <div className="reaction-add-wrap">
          <button
            className="reaction-add-btn"
            onClick={() => setShowPicker(!showPicker)}
            title="Réagir"
          >
            +
          </button>
          {showPicker && (
            <div className="reaction-picker">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className="reaction-picker-item"
                  onClick={() => handleReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Widget météo pour une position
const WeatherWidget = ({ latitude, longitude, city }) => {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!latitude || !longitude) { setLoading(false); return }
    let cancelled = false
    const fetchWeather = async () => {
      try {
        const { getWeather } = await import('../services/weatherService')
        const data = await getWeather(latitude, longitude)
        if (!cancelled) setWeather(data)
      } catch {
        // silently fail
      }
      if (!cancelled) setLoading(false)
    }
    fetchWeather()
    return () => { cancelled = true }
  }, [latitude, longitude])

  if (loading) return <div className="weather-widget weather-loading">Chargement m&eacute;t&eacute;o...</div>
  if (!weather) return null

  return (
    <div className="weather-widget">
      <div className="weather-main">
        <span className="weather-icon">{weather.icon}</span>
        <span className="weather-temp">{weather.temperature}°C</span>
      </div>
      <div className="weather-details">
        <span className="weather-label">{weather.label}</span>
        <div className="weather-extra">
          <span title="Humidit\u00e9">\uD83D\uDCA7 {weather.humidity}%</span>
          <span title="Vent">\uD83C\uDF2C\uFE0F {weather.windSpeed} km/h</span>
        </div>
      </div>
      {city && <span className="weather-city">{city}</span>}
    </div>
  )
}

const TravelerProfile = ({ travelerStatus, posts = [], trips = [] }) => {
  const { userData } = useAuth()
  const { project } = useProject()

  const validTrips = trips.filter(t => t.latitude && t.longitude)
  const countries = [...new Set(validTrips.map(t => t.country).filter(Boolean))]
  const lastTrip = validTrips[validTrips.length - 1]

  const totalKm = validTrips.reduce((sum, t, i) => {
    if (i === 0) return 0
    return sum + haversineKm(validTrips[i - 1].latitude, validTrips[i - 1].longitude, t.latitude, t.longitude)
  }, 0)

  const getDays = () => {
    if (validTrips.length === 0) return 0
    const first = validTrips[0]
    const startDate = first.arrivalDate
      ? new Date(first.arrivalDate)
      : first.createdAt?.toDate
        ? first.createdAt.toDate()
        : new Date()
    return Math.max(1, Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="traveler-profile">
      {/* En-tête profil */}
      <div className="profile-header">
        {userData?.photoBase64 ? (
          <img src={userData.photoBase64} alt="" className="profile-avatar-img" />
        ) : (
          <div className="profile-avatar">
            {(project?.travelerName || 'V')[0].toUpperCase()}
          </div>
        )}
        <div className="profile-info">
          <h2 className="profile-name">{project?.travelerName || 'Voyageur'}</h2>
          <p className="profile-bio">
            {project?.description || 'Tour du monde en cours...'}
          </p>
        </div>
      </div>

      {/* Statut actuel — dernière étape */}
      {lastTrip && (
        <div className="profile-card status-card">
          <div className="status-live">
            <span className="live-dot" />
            <span className="live-text">Derni&egrave;re &eacute;tape</span>
          </div>
          <h3 className="status-city">{lastTrip.city}</h3>
          <p className="status-country">
            {lastTrip.country || ''}
            {lastTrip.transport && (
              <span className="status-transport">
                {TRANSPORT_ICONS[lastTrip.transport]} {TRANSPORT_LABELS[lastTrip.transport]}
              </span>
            )}
          </p>
          {/* Météo actuelle */}
          <WeatherWidget
            latitude={lastTrip.latitude}
            longitude={lastTrip.longitude}
            city={lastTrip.city}
          />
          {(lastTrip.photos?.length > 0 || lastTrip.photoUrl) ? (
            <PhotoGallery
              photos={lastTrip.photos?.length > 0 ? lastTrip.photos : [lastTrip.photoUrl]}
              city={lastTrip.city}
            />
          ) : null}
        </div>
      )}

      {/* Stats rapides */}
      <div className="profile-card quick-stats">
        <div className="quick-stat">
          <span className="qs-value">{getDays()}</span>
          <span className="qs-label">jours</span>
        </div>
        <div className="qs-divider" />
        <div className="quick-stat">
          <span className="qs-value">{countries.length}</span>
          <span className="qs-label">pays</span>
        </div>
        <div className="qs-divider" />
        <div className="quick-stat">
          <span className="qs-value">
            {totalKm > 1000 ? `${(totalKm / 1000).toFixed(1)}k` : Math.round(totalKm)}
          </span>
          <span className="qs-label">km</span>
        </div>
      </div>

      {/* Pays visités */}
      {countries.length > 0 && (
        <div className="profile-card">
          <h4 className="card-title">Pays visit&eacute;s</h4>
          <div className="countries-grid">
            {countries.map((country, i) => (
              <div key={i} className="country-chip">
                <span className="country-flag">&#127758;</span>
                <span className="country-name">{country}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Derniers posts */}
      {posts.length > 0 && (
        <div className="profile-card">
          <h4 className="card-title">Derniers posts</h4>
          <div className="recent-list">
            {posts.slice(0, 4).map((post) => (
              <div key={post.id} className="recent-item">
                <div className="recent-dot" />
                <div className="recent-content">
                  <p className="recent-text">{post.text?.slice(0, 60)}{post.text?.length > 60 ? '...' : ''}</p>
                  <span className="recent-date">
                    {post.createdAt?.toDate
                      ? post.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Étapes parcourues avec galerie photos, transport et réactions */}
      {validTrips.length > 0 && (
        <div className="profile-card">
          <h4 className="card-title">&Eacute;tapes ({validTrips.length})</h4>
          <div className="stages-list">
            {validTrips.map((t, i) => {
              const tripPhotos = t.photos?.length > 0 ? t.photos : (t.photoUrl ? [t.photoUrl] : [])
              return (
                <div key={t.id || i} className="stage-item">
                  <div className="stage-header">
                    {t.transport ? (
                      <span className="stage-transport-icon" title={TRANSPORT_LABELS[t.transport]}>
                        {TRANSPORT_ICONS[t.transport] || '\uD83D\uDEA9'}
                      </span>
                    ) : (
                      <div className="recent-dot" style={{ background: 'var(--accent)' }} />
                    )}
                    <div className="stage-info">
                      <p className="stage-city">
                        {t.city}{t.country ? `, ${t.country}` : ''}
                      </p>
                      <div className="stage-meta">
                        {t.arrivalDate && (
                          <span className="recent-date">
                            {new Date(t.arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {t.transport && (
                          <span className="stage-transport-label">
                            {TRANSPORT_LABELS[t.transport]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {t.notes && <p className="stage-notes">{t.notes}</p>}
                  {tripPhotos.length > 0 && (
                    <PhotoGallery photos={tripPhotos} city={t.city} />
                  )}
                  <TripReactions trip={t} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TravelerProfile
