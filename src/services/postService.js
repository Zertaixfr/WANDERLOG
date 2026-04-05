// Service de gestion des posts (Firestore + Storage)
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { db, storage } from './firebase'

const POSTS_COLLECTION = 'posts'

// Écouter les posts en temps réel
export const subscribeToPosts = (callback) => {
  const q = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(posts)
  })
}

// Créer un nouveau post (admin uniquement)
export const createPost = async (postData, mediaFiles = []) => {
  // Upload des médias si présents
  const mediaUrls = await Promise.all(
    mediaFiles.map((file) => uploadMedia(file))
  )

  const post = {
    text: postData.text,
    location: postData.location || '',
    coordinates: postData.coordinates || null,
    country: postData.country || '',
    media: mediaUrls,
    likes: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, POSTS_COLLECTION), post)
  return docRef.id
}

// Upload d'un fichier média vers Firebase Storage
export const uploadMedia = (file) => {
  return new Promise((resolve, reject) => {
    const fileName = `posts/${Date.now()}_${file.name}`
    const storageRef = ref(storage, fileName)
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      null,
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve({
          url,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name,
        })
      }
    )
  })
}

// Liker / unliker un post
export const toggleLike = async (postId, userId) => {
  const postRef = doc(db, POSTS_COLLECTION, postId)

  // On vérifie si l'utilisateur a déjà liké
  const postSnap = await getDocs(query(collection(db, POSTS_COLLECTION)))
  const postDoc = postSnap.docs.find((d) => d.id === postId)

  if (!postDoc) return

  const likes = postDoc.data().likes || []
  const hasLiked = likes.includes(userId)

  await updateDoc(postRef, {
    likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
    likesCount: increment(hasLiked ? -1 : 1),
  })
}

// Ajouter un commentaire à un post
export const addComment = async (postId, comment) => {
  const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments')
  await addDoc(commentsRef, {
    text: comment.text,
    userId: comment.userId,
    userName: comment.userName,
    createdAt: serverTimestamp(),
  })

  // Incrémenter le compteur de commentaires
  const postRef = doc(db, POSTS_COLLECTION, postId)
  await updateDoc(postRef, {
    commentsCount: increment(1),
  })
}

// Écouter les commentaires d'un post en temps réel
export const subscribeToComments = (postId, callback) => {
  const q = query(
    collection(db, POSTS_COLLECTION, postId, 'comments'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(comments)
  })
}

// Supprimer un post (admin uniquement)
export const deletePost = async (postId) => {
  await deleteDoc(doc(db, POSTS_COLLECTION, postId))
}
