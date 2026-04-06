// Dashboard de statistiques — calculées depuis les trips et posts du projet
import { useProject } from '../contexts/ProjectContext'
import ExportPDF from './ExportPDF'

// Distance haversine en km
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const Stats = ({ trips = [], posts = [] }) => {
  const { project } = useProject()

  // Étapes valides
  const validTrips = trips.filter(t => t.latitude && t.longitude)

  // Pays visités (uniques)
  const countries = [...new Set(validTrips.map(t => t.country).filter(Boolean))]

  // Distance totale
  const totalKm = validTrips.reduce((sum, t, i) => {
    if (i === 0) return 0
    return sum + haversineKm(validTrips[i - 1].latitude, validTrips[i - 1].longitude, t.latitude, t.longitude)
  }, 0)

  // Jours de voyage (depuis la première étape)
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

  const days = getDays()

  // Répartition par pays
  const countryCount = {}
  validTrips.forEach(t => {
    if (t.country) countryCount[t.country] = (countryCount[t.country] || 0) + 1
  })
  const countryProgress = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      percent: Math.round((count / validTrips.length) * 100),
    }))

  const hasData = validTrips.length > 0

  return (
    <div className="stats-section">
      <div className="stats-header-row">
        <div>
          <h2 className="section-title">Statistiques</h2>
          {project && (
            <p className="section-subtitle">{project.name}</p>
          )}
        </div>
        <ExportPDF trips={trips} posts={posts} />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">&#128197;</span>
          <span className="stat-value">{days}</span>
          <span className="stat-label">Jours de voyage</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#127758;</span>
          <span className="stat-value">{countries.length}</span>
          <span className="stat-label">Pays visit&eacute;s</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#9992;</span>
          <span className="stat-value">
            {totalKm > 1000
              ? `${(totalKm / 1000).toFixed(1)}k`
              : Math.round(totalKm)}
          </span>
          <span className="stat-label">Km parcourus</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128205;</span>
          <span className="stat-value">{validTrips.length}</span>
          <span className="stat-label">&Eacute;tapes</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128247;</span>
          <span className="stat-value">{posts.length}</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128172;</span>
          <span className="stat-value">
            {posts.reduce((s, p) => s + (p.commentsCount || 0), 0)}
          </span>
          <span className="stat-label">Commentaires</span>
        </div>
      </div>

      {countryProgress.length > 0 && (
        <div className="country-progress">
          <h3 className="progress-title">&Eacute;tapes par pays</h3>
          {countryProgress.map((cp, i) => (
            <div key={i} className="progress-item">
              <div className="progress-header">
                <span className="progress-country">{cp.name}</span>
                <span className="progress-percent">{cp.percent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${cp.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {validTrips.length > 1 && (
        <div className="country-progress">
          <h3 className="progress-title">Trajet</h3>
          {validTrips.map((t, i) => (
            <div key={t.id || i} className="trip-timeline-item">
              <div className="trip-timeline-dot">{i + 1}</div>
              <div className="trip-timeline-info">
                <span className="trip-timeline-city">{t.city}{t.country ? `, ${t.country}` : ''}</span>
                {t.arrivalDate && <span className="trip-timeline-date">{new Date(t.arrivalDate).toLocaleDateString('fr-FR')}</span>}
              </div>
              {i < validTrips.length - 1 && (
                <span className="trip-timeline-dist">
                  {Math.round(haversineKm(t.latitude, t.longitude, validTrips[i + 1].latitude, validTrips[i + 1].longitude))} km
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasData && (
        <div className="stats-empty">
          <p>Les statistiques apparaitront d&egrave;s la premi&egrave;re &eacute;tape ajout&eacute;e</p>
        </div>
      )}
    </div>
  )
}

export default Stats
