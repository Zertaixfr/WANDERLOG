// Service d'authentification Firebase
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

// Inscription avec prénom et photo de profil (base64)
export const registerUser = async (email, password, displayName, avatarBase64 = null) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  // Mettre à jour le profil Firebase Auth
  await updateProfile(user, {
    displayName,
    photoURL: avatarBase64 ? 'firestore' : null,
  })

  // Sauvegarder dans Firestore (avec la photo en base64)
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    photoBase64: avatarBase64 || null,
    isAdmin: email === ADMIN_EMAIL,
    createdAt: serverTimestamp(),
  })

  return user
}

// Connexion
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// Déconnexion
export const logoutUser = async () => {
  await signOut(auth)
}

// Vérifier si admin
export const isAdmin = (user) => {
  return user?.email === ADMIN_EMAIL
}
