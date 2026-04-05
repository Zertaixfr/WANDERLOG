// En-tête de l'application avec navigation et déconnexion
import { useAuth } from '../contexts/AuthContext'
import { logoutUser } from '../services/authService'

const Header = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin } = useAuth()

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err)
    }
  }

  const tabs = [
    { id: 'globe', label: 'Globe', icon: '🌍' },
    { id: 'feed', label: 'Journal', icon: '📖' },
    { id: 'stats', label: 'Stats', icon: '📊' },
  ]

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-brand">
          <span className="brand-icon">&#9992;</span>
          <h1 className="brand-name">Wanderlog</h1>
        </div>
        <div className="header-user">
          <span className="user-name">
            {user?.displayName || 'Voyageur'}
            {isAdmin && <span className="admin-badge">Admin</span>}
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}

export default Header
