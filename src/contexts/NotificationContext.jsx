// Contexte de notifications — gère les notifications en temps réel
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans un NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const { user, demoMode } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [showPanel, setShowPanel] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Écouter les notifications en temps réel
  useEffect(() => {
    if (!user || demoMode) {
      setNotifications([])
      return
    }

    let unsubscribe = () => {}
    const init = async () => {
      const { subscribeToNotifications } = await import('../services/notificationService')
      unsubscribe = subscribeToNotifications(user.uid, setNotifications)
    }
    init()

    return () => unsubscribe()
  }, [user, demoMode])

  const markRead = useCallback(async (notificationId) => {
    if (demoMode || !user) return
    const { markNotificationRead } = await import('../services/notificationService')
    await markNotificationRead(user.uid, notificationId)
  }, [user, demoMode])

  const markAllRead = useCallback(async () => {
    if (demoMode || !user) return
    const { markAllNotificationsRead } = await import('../services/notificationService')
    await markAllNotificationsRead(user.uid)
  }, [user, demoMode])

  const togglePanel = useCallback(() => {
    setShowPanel((prev) => !prev)
  }, [])

  const closePanel = useCallback(() => {
    setShowPanel(false)
  }, [])

  const value = {
    notifications,
    unreadCount,
    showPanel,
    togglePanel,
    closePanel,
    markRead,
    markAllRead,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
