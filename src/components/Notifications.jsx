// Panneau de notifications — cloche avec badge + dropdown
import { useEffect, useRef } from 'react'
import { useNotifications } from '../contexts/NotificationContext'

const ICONS = {
  like: '\u2764\uFE0F',
  comment: '\uD83D\uDCAC',
  new_trip: '\u2708\uFE0F',
  new_post: '\uD83D\uDCDD',
}

const NotificationItem = ({ notification, onRead }) => {
  const date = notification.createdAt?.toDate?.()
  const icon = ICONS[notification.type] || '\uD83D\uDD14'
  const initial = (notification.fromUser || '?')[0].toUpperCase()

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
  }

  return (
    <div
      className={`notif-item ${notification.read ? '' : 'notif-unread'}`}
      onClick={handleClick}
    >
      <div className="notif-icon-wrap">
        {notification.fromUserPhoto ? (
          <img src={notification.fromUserPhoto} alt="" className="notif-avatar" />
        ) : (
          <div className="notif-avatar-placeholder">{initial}</div>
        )}
        <span className="notif-type-icon">{icon}</span>
      </div>
      <div className="notif-content">
        <p className="notif-message">{notification.message}</p>
        {date && (
          <span className="notif-date">
            {formatTimeAgo(date)}
          </span>
        )}
      </div>
      {!notification.read && <span className="notif-dot" />}
    </div>
  )
}

// Affichage relatif du temps
function formatTimeAgo(date) {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return "À l'instant"
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Bouton cloche avec badge
export const NotificationBell = () => {
  const { unreadCount, togglePanel } = useNotifications()

  return (
    <button className="notif-bell-btn" onClick={togglePanel} title="Notifications">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}
    </button>
  )
}

// Panneau déroulant des notifications
const NotificationPanel = () => {
  const { notifications, showPanel, closePanel, markRead, markAllRead, unreadCount } = useNotifications()
  const panelRef = useRef(null)

  // Fermer en cliquant à l'extérieur
  useEffect(() => {
    if (!showPanel) return
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.notif-bell-btn')) {
        closePanel()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPanel, closePanel])

  if (!showPanel) return null

  return (
    <div className="notif-panel" ref={panelRef}>
      <div className="notif-panel-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button className="notif-mark-all" onClick={markAllRead}>
            Tout marquer lu
          </button>
        )}
      </div>
      <div className="notif-panel-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <span>&#128276;</span>
            <p>Aucune notification</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={markRead} />
          ))
        )}
      </div>
    </div>
  )
}

export default NotificationPanel
