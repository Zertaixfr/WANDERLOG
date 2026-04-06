// Service de gestion des projets de voyage
import { isFirebaseConfigured, db } from './firebase'

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

// Ajouter une étape/trajet au projet (avec photo optionnelle)
export const addTrip = async (projectId, tripData, photoFile = null) => {
  if (!isFirebaseConfigured) return null

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')

  // Upload photo si fournie
  let photoUrl = null
  if (photoFile) {
    try {
      const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage')
      const { storage } = await import('./firebase')
      if (storage) {
        const fileName = `trips/${projectId}/${Date.now()}_${photoFile.name}`
        const storageRef = ref(storage, fileName)
        const uploadTask = uploadBytesResumable(storageRef, photoFile)
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, async () => {
            photoUrl = await getDownloadURL(uploadTask.snapshot.ref)
            resolve()
          })
        })
      }
    } catch (err) {
      console.error('Erreur upload photo trip:', err)
      // On continue sans photo plutôt que bloquer
    }
  }

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

  // Upload des médias si présents
  let mediaUrls = []
  if (mediaFiles.length > 0) {
    try {
      const { uploadMedia } = await import('./postService')
      mediaUrls = await Promise.all(mediaFiles.map((f) => uploadMedia(f)))
    } catch (err) {
      console.error('Erreur upload médias:', err)
      // On continue sans médias plutôt que bloquer
    }
  }

  const post = {
    text: postData.text,
    location: postData.location || '',
    country: postData.country || '',
    coordinates: postData.coordinates || null,
    media: mediaUrls,
    authorId: postData.authorId,
    authorName: postData.authorName,
    likes: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(
    collection(db, 'projects', projectId, 'posts'),
    post
  )
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
export const toggleProjectLike = async (projectId, postId, userId) => {
  if (!isFirebaseConfigured) return

  const { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } = await import('firebase/firestore')
  const postRef = doc(db, 'projects', projectId, 'posts', postId)
  const postSnap = await getDoc(postRef)

  if (!postSnap.exists()) return

  const likes = postSnap.data().likes || []
  const hasLiked = likes.includes(userId)

  await updateDoc(postRef, {
    likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
    likesCount: increment(hasLiked ? -1 : 1),
  })
}

// Ajouter un commentaire à un post dans un projet
export const addProjectComment = async (projectId, postId, comment) => {
  if (!isFirebaseConfigured) return

  const { collection, addDoc, doc, updateDoc, increment, serverTimestamp } = await import('firebase/firestore')

  await addDoc(
    collection(db, 'projects', projectId, 'posts', postId, 'comments'),
    {
      text: comment.text,
      userId: comment.userId,
      userName: comment.userName,
      createdAt: serverTimestamp(),
    }
  )

  await updateDoc(doc(db, 'projects', projectId, 'posts', postId), {
    commentsCount: increment(1),
  })
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
