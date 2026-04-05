// Composant principal — routage entre Auth et contenu protégé
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import AuthScreen from './components/AuthScreen'
import Header from './components/Header'
import Globe3D from './components/Globe3D'
import Feed from './components/Feed'
import Stats from './components/Stats'
import CreatePost from './components/CreatePost'
import { subscribeToTravelerStatus } from './services/travelerService'
import { subscribeToPosts } from './services/postService'
import { startGeoTracking, stopGeoTracking } from './services/travelerService'

function App() {
  const { user, isAdmin, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('globe')
  const [travelerStatus, setTravelerStatus] = useState(null)
  const [posts, setPosts] = useState([])

  // Écouter le statut du voyageur en temps réel
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToTravelerStatus(setTravelerStatus)
    return () => unsubscribe()
  }, [user])

  // Écouter les posts pour le globe (coordonnées)
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToPosts(setPosts)
    return () => unsubscribe()
  }, [user])

  // Tracking GPS automatique pour l'admin
  useEffect(() => {
    if (!isAdmin) return
    const watchId = startGeoTracking()
    return () => stopGeoTracking(watchId)
  }, [isAdmin])

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

  // Si non connecté, afficher l'écran d'auth
  if (!user) {
    return <AuthScreen />
  }

  // Contenu principal
  return (
    <div className="app">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main">
        {/* Globe 3D */}
        {activeTab === 'globe' && (
          <Globe3D travelerStatus={travelerStatus} posts={posts} />
        )}

        {/* Feed / Journal */}
        {activeTab === 'feed' && (
          <>
            <CreatePost />
            <Feed />
          </>
        )}

        {/* Stats */}
        {activeTab === 'stats' && <Stats />}
      </main>

      <footer className="app-footer">
        <p>Wanderlog &mdash; Carnet de voyage de Kilian</p>
      </footer>
    </div>
  )
}

export default App
