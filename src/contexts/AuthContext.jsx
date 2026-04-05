// Contexte d'authentification — gère l'état de connexion globalement
// En mode démo (sans Firebase), l'utilisateur est connecté automatiquement
import { createContext, useContext, useState, useEffect } from 'react'
import { isFirebaseConfigured, auth, db } from '../services/firebase'
import { DEMO_USER } from '../services/demoData'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  // Mode démo : Firebase non configuré
  const demoMode = !isFirebaseConfigured

  useEffect(() => {
    // Mode démo — connexion automatique avec un utilisateur fictif
    if (demoMode) {
      setUser(DEMO_USER)
      setUserData({ ...DEMO_USER, isAdmin: true })
      setLoading(false)
      return
    }

    // Mode Firebase — écouter l'état d'authentification
    let unsubscribe = () => {}
    const init = async () => {
      const { onAuthStateChanged } = await import('firebase/auth')
      const { doc, getDoc } = await import('firebase/firestore')

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser)
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (userDoc.exists()) {
              setUserData(userDoc.data())
            }
          } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error)
          }
        } else {
          setUser(null)
          setUserData(null)
        }
        setLoading(false)
      })
    }
    init()

    return () => unsubscribe()
  }, [demoMode])

  const isAdmin = userData?.isAdmin || false

  const value = {
    user,
    userData,
    isAdmin,
    loading,
    demoMode,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
