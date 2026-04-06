// Profil voyageur — panneau latéral avec infos du projet
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'

// Distance haversine
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
          <p className="status-country">{lastTrip.country || ''}</p>
          {lastTrip.photoUrl && (
            <img src={lastTrip.photoUrl} alt={lastTrip.city} className="status-photo" />
          )}
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

      {/* Étapes parcourues */}
      {validTrips.length > 0 && (
        <div className="profile-card">
          <h4 className="card-title">&Eacute;tapes ({validTrips.length})</h4>
          <div className="recent-list">
            {validTrips.map((t, i) => (
              <div key={t.id || i} className="recent-item">
                <div className="recent-dot" style={{ background: 'var(--accent)' }} />
                <div className="recent-content">
                  <p className="recent-text" style={{ fontWeight: 600 }}>
                    {t.city}{t.country ? `, ${t.country}` : ''}
                  </p>
                  {t.arrivalDate && (
                    <span className="recent-date">
                      {new Date(t.arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TravelerProfile
