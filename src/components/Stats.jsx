// Dashboard de statistiques — calculées depuis les données Firestore
// Supporte le mode démo avec données mock
import { useState, useEffect } from 'react'

const Stats = ({ demoMode = false, demoStatus = null }) => {
  const [status, setStatus] = useState(demoStatus)

  useEffect(() => {
    if (demoMode) {
      setStatus(demoStatus)
      return
    }

    // Mode Firebase — écoute temps réel
    let unsubscribe = () => {}
    const init = async () => {
      const { subscribeToTravelerStatus } = await import('../services/travelerService')
      unsubscribe = subscribeToTravelerStatus(setStatus)
    }
    init()
    return () => unsubscribe()
  }, [demoMode, demoStatus])

  // Calculer le nombre de jours depuis le départ
  const getDaysSinceDeparture = () => {
    if (!status?.departureDate) return 0
    const departure = status.departureDate.toDate
      ? status.departureDate.toDate()
      : new Date(status.departureDate)
    const now = new Date()
    const diffTime = Math.abs(now - departure)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const days = getDaysSinceDeparture()
  const countries = status?.countriesVisited || []
  const totalKm = status?.totalKm || 0

  // Données des barres de progression par pays
  const countryProgress = countries.map((country) => ({
    name: country,
    percent: Math.min(100, Math.round(100 / Math.max(countries.length, 1))),
  }))

  return (
    <div className="stats-section">
      <h2 className="section-title">Statistiques</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">&#128197;</span>
          <span className="stat-value">{days}</span>
          <span className="stat-label">Jours de voyage</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#127758;</span>
          <span className="stat-value">{countries.length}</span>
          <span className="stat-label">Pays visités</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#9992;</span>
          <span className="stat-value">
            {totalKm > 1000
              ? `${(totalKm / 1000).toFixed(1)}k`
              : totalKm}
          </span>
          <span className="stat-label">Km parcourus</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#128247;</span>
          <span className="stat-value">{status?.postsCount || 0}</span>
          <span className="stat-label">Posts publiés</span>
        </div>
      </div>

      {countries.length > 0 && (
        <div className="country-progress">
          <h3 className="progress-title">Temps par pays</h3>
          {countryProgress.map((cp, i) => (
            <div key={i} className="progress-item">
              <div className="progress-header">
                <span className="progress-country">{cp.name}</span>
                <span className="progress-percent">{cp.percent}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${cp.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!status && (
        <div className="stats-empty">
          <p>Les statistiques apparaîtront dès le début du voyage</p>
        </div>
      )}
    </div>
  )
}

export default Stats
