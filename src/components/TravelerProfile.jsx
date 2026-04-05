// Profil voyageur — panneau latéral avec toutes les infos du voyage
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Composant carte de statut actuel
const StatusCard = ({ travelerStatus }) => {
  if (!travelerStatus) return null

  return (
    <div className="profile-card status-card">
      <div className="status-live">
        <span className="live-dot" />
        <span className="live-text">En direct</span>
      </div>
      <h3 className="status-city">{travelerStatus.city || 'En route'}</h3>
      <p className="status-country">{travelerStatus.country || ''}</p>
      {travelerStatus.mood && (
        <p className="status-mood">{travelerStatus.mood}</p>
      )}
      {travelerStatus.weather && (
        <div className="status-weather">
          <span className="weather-icon">{travelerStatus.weather.icon}</span>
          <span className="weather-temp">{travelerStatus.weather.temp}</span>
        </div>
      )}
    </div>
  )
}

// Mini stats rapides
const QuickStats = ({ travelerStatus }) => {
  if (!travelerStatus) return null

  const getDays = () => {
    if (!travelerStatus.departureDate) return 0
    const dep = travelerStatus.departureDate.toDate
      ? travelerStatus.departureDate.toDate()
      : new Date(travelerStatus.departureDate)
    return Math.ceil(Math.abs(new Date() - dep) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="profile-card quick-stats">
      <div className="quick-stat">
        <span className="qs-value">{getDays()}</span>
        <span className="qs-label">jours</span>
      </div>
      <div className="qs-divider" />
      <div className="quick-stat">
        <span className="qs-value">{travelerStatus.countriesVisited?.length || 0}</span>
        <span className="qs-label">pays</span>
      </div>
      <div className="qs-divider" />
      <div className="quick-stat">
        <span className="qs-value">
          {(travelerStatus.totalKm || 0) > 1000
            ? `${((travelerStatus.totalKm || 0) / 1000).toFixed(1)}k`
            : travelerStatus.totalKm || 0}
        </span>
        <span className="qs-label">km</span>
      </div>
    </div>
  )
}

// Derniers posts / stories
const RecentUpdates = ({ posts = [] }) => {
  const recent = posts.slice(0, 3)
  if (recent.length === 0) return null

  return (
    <div className="profile-card">
      <h4 className="card-title">Derniers posts</h4>
      <div className="recent-list">
        {recent.map((post) => (
          <div key={post.id} className="recent-item">
            <div className="recent-dot" />
            <div className="recent-content">
              <p className="recent-location">{post.location || post.country || ''}</p>
              <p className="recent-text">{post.text?.slice(0, 80)}...</p>
              <span className="recent-date">
                {post.createdAt?.toDate?.()?.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pays visités avec drapeaux
const CountriesVisited = ({ countries = [] }) => {
  if (countries.length === 0) return null

  // Drapeaux emoji par pays
  const flags = {
    'Portugal': '\u{1F1F5}\u{1F1F9}',
    'Tha\u00EFlande': '\u{1F1F9}\u{1F1ED}',
    'Indon\u00E9sie': '\u{1F1EE}\u{1F1E9}',
    'Japon': '\u{1F1EF}\u{1F1F5}',
    'France': '\u{1F1EB}\u{1F1F7}',
    'Espagne': '\u{1F1EA}\u{1F1F8}',
    'Italie': '\u{1F1EE}\u{1F1F9}',
    'Maroc': '\u{1F1F2}\u{1F1E6}',
    'Australie': '\u{1F1E6}\u{1F1FA}',
    'Vietnam': '\u{1F1FB}\u{1F1F3}',
    'Inde': '\u{1F1EE}\u{1F1F3}',
    'Br\u00E9sil': '\u{1F1E7}\u{1F1F7}',
  }

  return (
    <div className="profile-card">
      <h4 className="card-title">Pays visit\u00E9s</h4>
      <div className="countries-grid">
        {countries.map((country, i) => (
          <div key={i} className="country-chip">
            <span className="country-flag">{flags[country] || '\u{1F30D}'}</span>
            <span className="country-name">{country}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Prochaines destinations
const NextDestinations = ({ destinations = [] }) => {
  if (destinations.length === 0) return null

  return (
    <div className="profile-card">
      <h4 className="card-title">Prochaines \u00E9tapes</h4>
      <div className="next-list">
        {destinations.map((dest, i) => (
          <div key={i} className="next-item">
            <span className="next-number">{i + 1}</span>
            <div>
              <p className="next-city">{dest.city}</p>
              <p className="next-country">{dest.country}</p>
            </div>
            {dest.date && <span className="next-date">{dest.date}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// Bucket list du voyageur
const BucketList = ({ items = [] }) => {
  if (items.length === 0) return null

  return (
    <div className="profile-card">
      <h4 className="card-title">Bucket List</h4>
      <div className="bucket-list">
        {items.map((item, i) => (
          <div key={i} className={`bucket-item ${item.done ? 'done' : ''}`}>
            <span className="bucket-check">{item.done ? '\u2714' : '\u25CB'}</span>
            <span className="bucket-text">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Conseils & recommandations
const Tips = ({ tips = [] }) => {
  if (tips.length === 0) return null

  return (
    <div className="profile-card">
      <h4 className="card-title">Mes bons plans</h4>
      <div className="tips-list">
        {tips.map((tip, i) => (
          <div key={i} className="tip-item">
            <span className="tip-icon">{tip.icon}</span>
            <div>
              <p className="tip-title">{tip.title}</p>
              <p className="tip-desc">{tip.description}</p>
              {tip.location && <span className="tip-location">{tip.location}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Composant principal du profil voyageur
const TravelerProfile = ({ travelerStatus, posts = [] }) => {
  const { isAdmin } = useAuth()

  // Données enrichies depuis le statut voyageur
  const countries = travelerStatus?.countriesVisited || []
  const nextDestinations = travelerStatus?.nextDestinations || []
  const bucketList = travelerStatus?.bucketList || []
  const tips = travelerStatus?.tips || []

  return (
    <div className="traveler-profile">
      {/* En-t\u00EAte du profil */}
      <div className="profile-header">
        <div className="profile-avatar">K</div>
        <div className="profile-info">
          <h2 className="profile-name">Kilian</h2>
          <p className="profile-bio">
            {travelerStatus?.bio || 'Tour du monde en cours...'}
          </p>
        </div>
      </div>

      {/* Statut actuel */}
      <StatusCard travelerStatus={travelerStatus} />

      {/* Stats rapides */}
      <QuickStats travelerStatus={travelerStatus} />

      {/* Pays visit\u00E9s */}
      <CountriesVisited countries={countries} />

      {/* Prochaines destinations */}
      <NextDestinations destinations={nextDestinations} />

      {/* Derniers posts */}
      <RecentUpdates posts={posts} />

      {/* Bucket List */}
      <BucketList items={bucketList} />

      {/* Bons plans */}
      <Tips tips={tips} />
    </div>
  )
}

export default TravelerProfile
