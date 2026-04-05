// Vérifie si Firebase est configuré avec de vraies clés
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY

export const isFirebaseConfigured = apiKey && apiKey !== 'your_api_key' && apiKey.length > 10

let auth = null
let db = null
let storage = null

if (isFirebaseConfigured) {
  // Initialisation Firebase uniquement si configuré
  const { initializeApp } = await import('firebase/app')
  const { getAuth } = await import('firebase/auth')
  const { getFirestore } = await import('firebase/firestore')
  const { getStorage } = await import('firebase/storage')

  const firebaseConfig = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
}

export { auth, db, storage }
