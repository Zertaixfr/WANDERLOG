// Service de gestion des notifications
import { isFirebaseConfigured, db } from './firebase'

// Créer une notification pour un utilisateur
export const createNotification = async (targetUserId, notification) => {
  if (!isFirebaseConfigured || !targetUserId) return

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')

  await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
    type: notification.type, // 'like', 'comment', 'new_trip', 'new_post'
    message: notification.message,
    fromUser: notification.fromUser || '',
    fromUserPhoto: notification.fromUserPhoto || null,
    postId: notification.postId || null,
    projectId: notification.projectId || null,
    read: false,
    createdAt: serverTimestamp(),
  })
}

// Écouter les notifications d'un utilisateur en temps réel
export const subscribeToNotifications = (userId, callback) => {
  if (!isFirebaseConfigured || !userId) return () => {}

  let unsubscribe = () => {}
  const init = async () => {
    const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore')
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(notifications)
    })
  }
  init()

  return () => unsubscribe()
}

// Marquer une notification comme lue
export const markNotificationRead = async (userId, notificationId) => {
  if (!isFirebaseConfigured) return

  const { doc, updateDoc } = await import('firebase/firestore')
  await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
    read: true,
  })
}

// Marquer toutes les notifications comme lues
export const markAllNotificationsRead = async (userId) => {
  if (!isFirebaseConfigured) return

  const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore')
  const q = query(
    collection(db, 'users', userId, 'notifications'),
    where('read', '==', false)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true })
  })
  await batch.commit()
}
