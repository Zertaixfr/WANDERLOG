// Service de géolocalisation et statut du voyageur
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const TRAVELER_DOC = 'traveler_status/current'

// Mettre à jour la position GPS du voyageur (admin uniquement)
export const updateTravelerPosition = async (position) => {
  await setDoc(doc(db, TRAVELER_DOC), {
    latitude: position.latitude,
    longitude: position.longitude,
    country: position.country || '',
    city: position.city || '',
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// Mettre à jour les stats du voyageur
export const updateTravelerStats = async (stats) => {
  await setDoc(doc(db, TRAVELER_DOC), {
    departureDate: stats.departureDate || null,
    countriesVisited: stats.countriesVisited || [],
    totalKm: stats.totalKm || 0,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// Écouter le statut du voyageur en temps réel
export const subscribeToTravelerStatus = (callback) => {
  return onSnapshot(doc(db, TRAVELER_DOC), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data())
    } else {
      callback(null)
    }
  })
}

// Démarrer le tracking GPS (admin uniquement, depuis le navigateur)
export const startGeoTracking = (onPositionUpdate) => {
  if (!navigator.geolocation) {
    console.error('La géolocalisation n\'est pas supportée par ce navigateur')
    return null
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      // Mettre à jour Firestore avec la nouvelle position
      updateTravelerPosition(coords)
      if (onPositionUpdate) onPositionUpdate(coords)
    },
    (error) => {
      console.error('Erreur de géolocalisation:', error.message)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache la position pendant 1 minute
    }
  )

  return watchId
}

// Arrêter le tracking GPS
export const stopGeoTracking = (watchId) => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
  }
}
