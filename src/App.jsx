// Composant principal — routage entre Auth et contenu protégé
// Supporte le mode démo (sans Firebase) avec des données mock
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { isFirebaseConfigured } from './services/firebase'
import AuthScreen from './components/AuthScreen'
import Header from './components/Header'
import Globe3D from './components/Globe3D'
import Feed from './components/Feed'
import Stats from './components/Stats'
import CreatePost from './components/CreatePost'
import { DEMO_POSTS, DEMO_TRAVELER_STATUS } from './services/demoData'

function App() {
  const { user, isAdmin, loading, demoMode } = useAuth()
  const [activeTab, setActiveTab] = useState('globe')
  const [travelerStatus, setTravelerStatus] = useState(null)
  const [posts, setPosts] = useState([])

  // Charger les données (Firestore en prod, mock en démo)
  useEffect(() => {
    if (!user) return

    if (demoMode) {
      // Mode démo — données statiques
      setTravelerStatus(DEMO_TRAVELER_STATUS)
      setPosts(DEMO_POSTS)
      return
    }

    // Mode Firebase — écoute temps réel
    let unsubPosts, unsubStatus
    const init = async () => {
      const { subscribeToPosts } = await import('./services/postService')
      const { subscribeToTravelerStatus } = await import('./services/travelerService')
      unsubPosts = subscribeToPosts(setPosts)
      unsubStatus = subscribeToTravelerStatus(setTravelerStatus)
    }
    init()

    return () => {
      unsubPosts?.()
      unsubStatus?.()
    }
  }, [user, demoMode])

  // Tracking GPS automatique pour l'admin (mode Firebase uniquement)
  useEffect(() => {
    if (!isAdmin || demoMode) return
    let watchId
    const init = async () => {
      const { startGeoTracking, stopGeoTracking } = await import('./services/travelerService')
      watchId = startGeoTracking()
    }
    init()
    return () => {
      if (watchId !== undefined) {
        import('./services/travelerService').then(({ stopGeoTracking }) => stopGeoTracking(watchId))
      }
    }
  }, [isAdmin, demoMode])

  // Écran de chargement
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="loading-icon">&#9992;</span>
          <h1 className="loading-title">Wanderlog</h1>
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  // Si non connecté (mode Firebase uniquement), afficher l'écran d'auth
  if (!user) {
    return <AuthScreen />
  }

  // Contenu principal
  return (
    <div className="app">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Bannière mode démo */}
      {demoMode && (
        <div className="demo-banner">
          Mode démo — Configurez Firebase dans <code>.env</code> pour activer toutes les fonctionnalités
        </div>
      )}

      <main className="app-main">
        {activeTab === 'globe' && (
          <Globe3D travelerStatus={travelerStatus} posts={posts} />
        )}

        {activeTab === 'feed' && (
          <>
            {!demoMode && <CreatePost />}
            <Feed demoMode={demoMode} demoPosts={posts} />
          </>
        )}

        {activeTab === 'stats' && (
          <Stats demoMode={demoMode} demoStatus={travelerStatus} />
        )}
      </main>

      <footer className="app-footer">
        <p>Wanderlog &mdash; Carnet de voyage de Kilian</p>
      </footer>
    </div>
  )
}

export default App
