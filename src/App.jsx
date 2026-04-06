// Composant principal — layout split : globe + profil voyageur sur desktop
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useProject } from './contexts/ProjectContext'
import AuthScreen from './components/AuthScreen'
import ProjectScreen from './components/ProjectScreen'
import Header from './components/Header'
import Globe3D from './components/Globe3D'
import Feed from './components/Feed'
import Stats from './components/Stats'
import CreatePost from './components/CreatePost'
import AddTrip from './components/AddTrip'
import TravelerProfile from './components/TravelerProfile'
import Settings from './components/Settings'
import { DEMO_POSTS, DEMO_TRAVELER_STATUS } from './services/demoData'

function App() {
  const { user, isAdmin, loading: authLoading, demoMode } = useAuth()
  const { project, isOwner, loading: projectLoading } = useProject()
  const [activeTab, setActiveTab] = useState('globe')
  const [travelerStatus, setTravelerStatus] = useState(null)
  const [posts, setPosts] = useState([])
  const [trips, setTrips] = useState([])

  // Charger les données du projet
  useEffect(() => {
    if (!user || !project) return

    if (demoMode) {
      setTravelerStatus(DEMO_TRAVELER_STATUS)
      setPosts(DEMO_POSTS)
      return
    }

    let unsubPosts, unsubStatus, unsubTrips
    const init = async () => {
      const {
        subscribeToProjectPosts,
        subscribeToProjectTravelerStatus,
        subscribeToTrips,
      } = await import('./services/projectService')

      unsubPosts = subscribeToProjectPosts(project.id, (fetchedPosts) => {
        setPosts(fetchedPosts)
      })
      unsubStatus = subscribeToProjectTravelerStatus(project.id, setTravelerStatus)
      unsubTrips = subscribeToTrips(project.id, setTrips)
    }
    init()

    return () => {
      unsubPosts?.()
      unsubStatus?.()
      unsubTrips?.()
    }
  }, [user, project?.id, demoMode])

  // Géolocalisation pour le propriétaire
  useEffect(() => {
    if (!isOwner || demoMode || !project) return
    let watchId
    const init = async () => {
      const { updateProjectTravelerStatus } = await import('./services/projectService')
      if (!navigator.geolocation) return
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            await updateProjectTravelerStatus(project.id, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            })
          } catch (err) {
            console.error('Erreur géoloc:', err)
          }
        },
        (err) => console.error('Erreur GPS:', err),
        { enableHighAccuracy: true, maximumAge: 60000 }
      )
    }
    init()
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
    }
  }, [isOwner, demoMode, project?.id])

  // Écran de chargement
  if (authLoading || projectLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-compass">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <h1 className="loading-title">Wanderlog</h1>
          <p className="loading-subtitle">Pr&eacute;paration du voyage...</p>
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  // Pas connecté → écran d'authentification
  if (!user) {
    return <AuthScreen />
  }

  // Pas de projet sélectionné → écran de sélection/création
  if (!project) {
    return <ProjectScreen />
  }

  // App principale avec projet actif
  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        posts={posts}
        trips={trips}
        onSearchResult={(result) => {
          if (result.type === 'post') setActiveTab('feed')
          else if (result.type === 'trip') setActiveTab('globe')
        }}
      />

      {demoMode && (
        <div className="demo-banner">
          Mode d&eacute;mo &mdash; Configurez Firebase dans <code>.env</code> pour activer toutes les fonctionnalit&eacute;s
        </div>
      )}

      <main className="app-main">
        {/* Vue Globe — layout split sur desktop */}
        {activeTab === 'globe' && (
          <div className="globe-layout">
            <div className="globe-panel">
              <Globe3D travelerStatus={travelerStatus} posts={posts} trips={trips} />
            </div>
            <aside className="sidebar-panel">
              <TravelerProfile travelerStatus={travelerStatus} posts={posts} trips={trips} />
              {isOwner && <AddTrip onTripAdded={() => {}} />}
            </aside>
          </div>
        )}

        {/* Vue Journal */}
        {activeTab === 'feed' && (
          <div className="feed-wrapper">
            {isOwner && <CreatePost />}
            <Feed demoMode={demoMode} demoPosts={posts} />
          </div>
        )}

        {/* Vue Stats */}
        {activeTab === 'stats' && (
          <Stats trips={trips} posts={posts} />
        )}

        {/* Vue Paramètres */}
        {activeTab === 'settings' && (
          <Settings />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-line" />
          <span className="footer-compass">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.5" />
            </svg>
          </span>
          <div className="footer-line" />
        </div>
        <p className="footer-text">Wanderlog &mdash; {project.name}</p>
        <p className="footer-coords">Code : {project.code}</p>
      </footer>
    </div>
  )
}

export default App
