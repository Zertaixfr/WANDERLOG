// En-tête de l'application — ambiance carnet de voyage
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { logoutUser } from '../services/authService'
import { NotificationBell } from './Notifications'
import NotificationPanel from './Notifications'
import SearchBar from './SearchBar'

const Header = ({ activeTab, setActiveTab, posts, trips, onSearchResult }) => {
  const { user, userData, isAdmin, demoMode } = useAuth()
  const { project, isOwner, leaveProject } = useProject()
  const [shareToast, setShareToast] = useState(false)

  const handleShare = async () => {
    const shareData = {
      title: `Wanderlog — ${project?.name || 'Voyage'}`,
      text: `Suivez mon voyage "${project?.name}" sur Wanderlog ! Code d'accès : ${project?.code}`,
      url: window.location.origin + '?join=' + project?.code,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.text + '\n' + shareData.url)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      }
    } catch {
      // Cancelled or failed — try clipboard fallback
      try {
        await navigator.clipboard.writeText(shareData.text + '\n' + shareData.url)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      } catch { /* ignore */ }
    }
  }

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
    { id: 'timeline', label: 'Timeline', icon: '&#128340;' },
    { id: 'feed', label: 'Journal', icon: '&#9997;' },
    { id: 'stats', label: 'Aventure', icon: '&#9776;' },
    { id: 'settings', label: 'Param\u00e8tres', icon: '&#9881;' },
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
          <button className="share-btn" onClick={handleShare} title="Partager le carnet">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          {shareToast && <div className="share-toast">Lien copi&eacute; !</div>}
          <div className="notif-wrapper">
            <NotificationBell />
            <NotificationPanel />
          </div>
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

      {/* Navigation + Recherche */}
      <nav className="header-nav">
        <div className="nav-tabs">
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
        </div>
        <SearchBar posts={posts} trips={trips} onResultClick={onSearchResult} />
      </nav>
    </header>
  )
}

export default Header
