// Service d'authentification Firebase
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

// Email admin — seul compte autorisé à créer des posts
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

// Inscription d'un nouvel utilisateur
export const registerUser = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  // Mise à jour du profil avec le nom d'affichage
  await updateProfile(user, { displayName })

  // Création du document utilisateur dans Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    isAdmin: email === ADMIN_EMAIL,
    createdAt: serverTimestamp(),
  })

  return user
}

// Connexion d'un utilisateur existant
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// Déconnexion
export const logoutUser = async () => {
  await signOut(auth)
}

// Vérifier si l'utilisateur est admin
export const isAdmin = (user) => {
  return user?.email === ADMIN_EMAIL
}
