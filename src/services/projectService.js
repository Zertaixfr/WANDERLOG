// Service de gestion des projets de voyage
import { isFirebaseConfigured, db } from './firebase'
import { createNotification } from './notificationService'

// Générer un code de partage unique (6 caractères)
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Créer un nouveau projet
export const createProject = async (projectData, userId) => {
  if (!isFirebaseConfigured) return null

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
  const code = generateCode()

  const project = {
    name: projectData.name,
    description: projectData.description || '',
    travelerName: projectData.travelerName || '',
    code,
    ownerId: userId,
    members: [userId],
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, 'projects'), project)
  return { id: docRef.id, ...project }
}

// Rejoindre un projet avec un code
export const joinProject = async (code, userId) => {
  if (!isFirebaseConfigured) return null

  const { collection, query, where, getDocs, updateDoc, arrayUnion } = await import('firebase/firestore')

  const q = query(
    collection(db, 'projects'),
    where('code', '==', code.toUpperCase().trim())
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Aucun projet trouvé avec ce code')
  }

  const projectDoc = snapshot.docs[0]
  const projectData = projectDoc.data()

  // Vérifier si l'utilisateur est déjà membre
  if (projectData.members?.includes(userId)) {
    return { id: projectDoc.id, ...projectData }
  }

  // Ajouter l'utilisateur aux membres
  await updateDoc(projectDoc.ref, {
    members: arrayUnion(userId),
  })

  return { id: projectDoc.id, ...projectData }
}

// Récupérer les projets d'un utilisateur
export const getUserProjects = async (userId) => {
  if (!isFirebaseConfigured) return []

  const { collection, query, where, getDocs } = await import('firebase/firestore')

  const q = query(
    collection(db, 'projects'),
    where('members', 'array-contains', userId)
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

// Écouter un projet en temps réel
export const subscribeToProject = async (projectId, callback) => {
  if (!isFirebaseConfigured) return () => {}

  const { doc, onSnapshot } = await import('firebase/firestore')

  return onSnapshot(doc(db, 'projects', projectId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() })
    }
  })
}

// Compresser et convertir en base64 (stocké directement dans Firestore, pas de Storage)
const imageToBase64 = (file, maxSize = 400, quality = 0.5) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) { resolve(null); return }
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > h && w > maxSize) { h = h * maxSize / w; w = maxSize }
      else if (h > maxSize) { w = w * maxSize / h; h = maxSize }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

// Ajouter une étape/trajet au projet (avec photo optionnelle)
export const addTrip = async (projectId, tripData, photoFile = null, addedByUserId = null) => {
  if (!isFirebaseConfigured) return null

  const { collection, addDoc, doc, getDoc, serverTimestamp } = await import('firebase/firestore')

  // Convertir photo en base64 miniature (pas de Firebase Storage)
  const photoUrl = photoFile ? await imageToBase64(photoFile) : null

  const trip = {
    city: tripData.city,
    country: tripData.country,
    latitude: tripData.latitude,
    longitude: tripData.longitude,
    arrivalDate: tripData.arrivalDate || null,
    notes: tripData.notes || '',
    photoUrl,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(
    collection(db, 'projects', projectId, 'trips'),
    trip
  )

  // Notifier tous les membres du projet (sauf celui qui ajoute)
  if (addedByUserId) {
    const projectSnap = await getDoc(doc(db, 'projects', projectId))
    if (projectSnap.exists()) {
      const members = projectSnap.data().members || []
      members.forEach((memberId) => {
        if (memberId !== addedByUserId) {
          createNotification(memberId, {
            type: 'new_trip',
            message: `Nouvelle étape : ${tripData.city}, ${tripData.country}`,
            fromUser: '',
            projectId,
          }).catch(() => {})
        }
      })
    }
  }

  return { id: docRef.id, ...trip }
}

// Écouter les étapes d'un projet en temps réel
export const subscribeToTrips = (projectId, callback) => {
  if (!isFirebaseConfigured) return () => {}

  let unsubscribe = () => {}
  const init = async () => {
    const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore')
    const q = query(
      collection(db, 'projects', projectId, 'trips'),
      orderBy('createdAt', 'asc')
    )
    unsubscribe = onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(trips)
    })
  }
  init()

  return () => unsubscribe()
}

// Supprimer une étape
export const deleteTrip = async (projectId, tripId) => {
  if (!isFirebaseConfigured) return

  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(db, 'projects', projectId, 'trips', tripId))
}

// Créer un post dans un projet
export const createProjectPost = async (projectId, postData, mediaFiles = []) => {
  if (!isFirebaseConfigured) return null

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')

  // Convertir les médias en base64 (pas de Firebase Storage)
  let mediaUrls = []
  if (mediaFiles.length > 0) {
    const results = await Promise.all(mediaFiles.map(async (f) => {
      const b64 = await imageToBase64(f, 800, 0.6)
      return b64 ? { url: b64, type: 'image', name: f.name } : null
    }))
    mediaUrls = results.filter(Boolean)
  }

  const post = {
    text: postData.text,
    location: postData.location || '',
    country: postData.country || '',
    coordinates: postData.coordinates || null,
    media: mediaUrls,
    authorId: postData.authorId,
    authorName: postData.authorName,
    authorPhoto: postData.authorPhoto || null,
    likes: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(
    collection(db, 'projects', projectId, 'posts'),
    post
  )

  // Notifier tous les membres du projet (sauf l'auteur)
  if (postData.authorId) {
    const { doc, getDoc } = await import('firebase/firestore')
    const projectSnap = await getDoc(doc(db, 'projects', projectId))
    if (projectSnap.exists()) {
      const members = projectSnap.data().members || []
      members.forEach((memberId) => {
        if (memberId !== postData.authorId) {
          createNotification(memberId, {
            type: 'new_post',
            message: `${postData.authorName || 'Le voyageur'} a publié un nouveau post`,
            fromUser: postData.authorName || '',
            fromUserPhoto: postData.authorPhoto || null,
            postId: docRef.id,
            projectId,
          }).catch(() => {})
        }
      })
    }
  }

  return docRef.id
}

// Écouter les posts d'un projet en temps réel
export const subscribeToProjectPosts = (projectId, callback) => {
  if (!isFirebaseConfigured) return () => {}

  let unsubscribe = () => {}
  const init = async () => {
    const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore')
    const q = query(
      collection(db, 'projects', projectId, 'posts'),
      orderBy('createdAt', 'desc')
    )
    unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(posts)
    })
  }
  init()

  return () => unsubscribe()
}

// Liker un post dans un projet
export const toggleProjectLike = async (projectId, postId, userId, userName, userPhoto) => {
  if (!isFirebaseConfigured) return

  const { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } = await import('firebase/firestore')
  const postRef = doc(db, 'projects', projectId, 'posts', postId)
  const postSnap = await getDoc(postRef)

  if (!postSnap.exists()) return

  const postData = postSnap.data()
  const likes = postData.likes || []
  const hasLiked = likes.includes(userId)

  await updateDoc(postRef, {
    likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
    likesCount: increment(hasLiked ? -1 : 1),
  })

  // Notifier l'auteur du post (sauf si c'est soi-même, et seulement pour un like)
  if (!hasLiked && postData.authorId && postData.authorId !== userId) {
    createNotification(postData.authorId, {
      type: 'like',
      message: `${userName || 'Quelqu\'un'} a aimé votre post`,
      fromUser: userName || '',
      fromUserPhoto: userPhoto || null,
      postId,
      projectId,
    }).catch(() => {})
  }
}

// Ajouter un commentaire à un post dans un projet
export const addProjectComment = async (projectId, postId, comment) => {
  if (!isFirebaseConfigured) return

  const { collection, addDoc, doc, updateDoc, getDoc, increment, serverTimestamp } = await import('firebase/firestore')

  await addDoc(
    collection(db, 'projects', projectId, 'posts', postId, 'comments'),
    {
      text: comment.text,
      userId: comment.userId,
      userName: comment.userName,
      userPhoto: comment.userPhoto || null,
      createdAt: serverTimestamp(),
    }
  )

  const postRef = doc(db, 'projects', projectId, 'posts', postId)
  await updateDoc(postRef, {
    commentsCount: increment(1),
  })

  // Notifier l'auteur du post (sauf si c'est soi-même)
  const postSnap = await getDoc(postRef)
  if (postSnap.exists()) {
    const postData = postSnap.data()
    if (postData.authorId && postData.authorId !== comment.userId) {
      createNotification(postData.authorId, {
        type: 'comment',
        message: `${comment.userName || 'Quelqu\'un'} a commenté votre post`,
        fromUser: comment.userName || '',
        fromUserPhoto: comment.userPhoto || null,
        postId,
        projectId,
      }).catch(() => {})
    }
  }
}

// Écouter les commentaires d'un post
export const subscribeToProjectComments = (projectId, postId, callback) => {
  if (!isFirebaseConfigured) return () => {}

  let unsubscribe = () => {}
  const init = async () => {
    const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore')
    const q = query(
      collection(db, 'projects', projectId, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    )
    unsubscribe = onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(comments)
    })
  }
  init()

  return () => unsubscribe()
}

// Mettre à jour le statut du voyageur dans un projet
export const updateProjectTravelerStatus = async (projectId, status) => {
  if (!isFirebaseConfigured) return

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

  await setDoc(doc(db, 'projects', projectId, 'traveler_status', 'current'), {
    ...status,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// Écouter le statut voyageur d'un projet
export const subscribeToProjectTravelerStatus = (projectId, callback) => {
  if (!isFirebaseConfigured) return () => {}

  let unsubscribe = () => {}
  const init = async () => {
    const { doc, onSnapshot } = await import('firebase/firestore')
    unsubscribe = onSnapshot(
      doc(db, 'projects', projectId, 'traveler_status', 'current'),
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.data() : null)
      }
    )
  }
  init()

  return () => unsubscribe()
}
