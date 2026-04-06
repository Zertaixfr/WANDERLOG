// En-tête de l'application — ambiance carnet de voyage
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { logoutUser } from '../services/authService'

const Header = ({ activeTab, setActiveTab }) => {
  const { user, userData, isAdmin, demoMode } = useAuth()
  const { project, isOwner, leaveProject } = useProject()

  const handleLogout = async () => {
    if (demoMode) return
    try {
      await logoutUser()
    } catch (err) {
      console.error('Erreur lors de la d\u00e9connexion:', err)
    }
  }

  const tabs = [
    { id: 'globe', label: 'Explorer', icon: '&#9992;' },
    { id: 'feed', label: 'Journal', icon: '&#9997;' },
    { id: 'stats', label: 'Aventure', icon: '&#9776;' },
  ]

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-brand">
          <div className="brand-compass">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <div>
            <h1 className="brand-name">Wanderlog</h1>
            <span className="brand-tagline">
              {project?.name || 'Tour du monde'}
              {project?.code && (
                <span className="project-code-badge">{project.code}</span>
              )}
            </span>
          </div>
        </div>
        <div className="header-user">
          {userData?.photoBase64 ? (
            <img src={userData.photoBase64} alt="" className="user-avatar-img" />
          ) : (
            <div className="user-avatar-small">
              {(user?.displayName || 'V')[0].toUpperCase()}
            </div>
          )}
          <div className="user-info">
            <span className="user-name">
              {user?.displayName || 'Voyageur'}
              {isOwner && <span className="admin-badge">Cr\u00e9ateur</span>}
            </span>
            <div className="user-actions">
              <button className="logout-btn" onClick={leaveProject}>
                Changer de carnet
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                D\u00e9connexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon" dangerouslySetInnerHTML={{ __html: tab.icon }} />
            <span className="nav-label">{tab.label}</span>
            {activeTab === tab.id && <span className="nav-indicator" />}
          </button>
        ))}
      </nav>
    </header>
  )
}

export default Header
