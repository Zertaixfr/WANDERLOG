// Feed / Journal — affiche les posts du projet avec likes, commentaires, édition et suppression
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { DEMO_COMMENTS } from '../services/demoData'

// Composant commentaire — éditable et supprimable par l'auteur
const Comment = ({ comment, postId, demoMode }) => {
  const { user } = useAuth()
  const { project } = useProject()
  const date = comment.createdAt?.toDate?.()
  const initial = (comment.userName || 'V')[0].toUpperCase()
  const isAuthor = user?.uid === comment.userId

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [showMenu, setShowMenu] = useState(false)

  const handleEdit = async () => {
    if (!editText.trim() || demoMode) return
    const { updateProjectComment } = await import('../services/projectService')
    await updateProjectComment(project.id, postId, comment.id, editText.trim())
    setEditing(false)
  }

  const handleDelete = async () => {
    if (demoMode) return
    if (!confirm('Supprimer ce commentaire ?')) return
    const { deleteProjectComment } = await import('../services/projectService')
    await deleteProjectComment(project.id, postId, comment.id)
  }

  return (
    <div className="comment">
      {comment.userPhoto ? (
        <img src={comment.userPhoto} alt="" className="comment-avatar-img" />
      ) : (
        <div className="comment-avatar">{initial}</div>
      )}
      <div className="comment-body">
        <span className="comment-author">{comment.userName}</span>
        {editing ? (
          <div className="edit-inline">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="edit-inline-input"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false) }}
            />
            <div className="edit-inline-actions">
              <button className="edit-save-btn" onClick={handleEdit}>OK</button>
              <button className="edit-cancel-btn" onClick={() => { setEditing(false); setEditText(comment.text) }}>Annuler</button>
            </div>
          </div>
        ) : (
          <span className="comment-text">{comment.text}</span>
        )}
      </div>
      {date && !editing && (
        <span className="comment-date">{date.toLocaleDateString('fr-FR')}</span>
      )}
      {isAuthor && !editing && !demoMode && (
        <div className="item-menu-wrap">
          <button className="item-menu-btn" onClick={() => setShowMenu(!showMenu)}>&#8943;</button>
          {showMenu && (
            <div className="item-menu" onMouseLeave={() => setShowMenu(false)}>
              <button onClick={() => { setEditing(true); setShowMenu(false) }}>Modifier</button>
              <button className="item-menu-danger" onClick={() => { handleDelete(); setShowMenu(false) }}>Supprimer</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Composant post — éditable et supprimable par l'auteur
const PostCard = ({ post, demoMode }) => {
  const { user, userData } = useAuth()
  const { project, isOwner } = useProject()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [localLikes, setLocalLikes] = useState(post.likesCount || 0)
  const [hasLiked, setHasLiked] = useState(post.likes?.includes(user?.uid))
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Édition du post
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.text)
  const [editLocation, setEditLocation] = useState(post.location || '')
  const [editCountry, setEditCountry] = useState(post.country || '')
  const [showMenu, setShowMenu] = useState(false)

  const postDate = post.createdAt?.toDate?.()
  const authorInitial = (post.authorName || 'K')[0].toUpperCase()
  const canEdit = user?.uid === post.authorId || isOwner

  // Charger les commentaires
  useEffect(() => {
    if (!showComments) return

    if (demoMode) {
      setComments(DEMO_COMMENTS[post.id] || [])
      return
    }

    let unsubscribe = () => {}
    const init = async () => {
      const { subscribeToProjectComments } = await import('../services/projectService')
      unsubscribe = subscribeToProjectComments(project.id, post.id, setComments)
    }
    init()
    return () => unsubscribe()
  }, [showComments, post.id, demoMode, project?.id])

  const handleLike = async () => {
    if (!user) return
    if (demoMode) {
      setHasLiked(!hasLiked)
      setLocalLikes((prev) => prev + (hasLiked ? -1 : 1))
      return
    }
    const { toggleProjectLike } = await import('../services/projectService')
    await toggleProjectLike(project.id, post.id, user.uid, user.displayName, userData?.photoBase64)
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user || isSubmitting) return
    setIsSubmitting(true)

    if (demoMode) {
      setComments((prev) => [...prev, {
        id: `demo-${Date.now()}`,
        text: newComment.trim(),
        userName: user.displayName || 'Voyageur',
        userId: user.uid,
        userPhoto: userData?.photoBase64 || null,
        createdAt: { toDate: () => new Date() },
      }])
      setNewComment('')
      setIsSubmitting(false)
      return
    }

    try {
      const { addProjectComment } = await import('../services/projectService')
      await addProjectComment(project.id, post.id, {
        text: newComment.trim(),
        userId: user.uid,
        userName: user.displayName || 'Anonyme',
        userPhoto: userData?.photoBase64 || null,
      })
      setNewComment('')
    } catch (err) {
      console.error('Erreur commentaire:', err)
    }
    setIsSubmitting(false)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || demoMode) return
    const { updateProjectPost } = await import('../services/projectService')
    await updateProjectPost(project.id, post.id, {
      text: editText.trim(),
      location: editLocation.trim(),
      country: editCountry.trim(),
    })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (demoMode) return
    if (!confirm('Supprimer ce post et tous ses commentaires ?')) return
    const { deleteProjectPost } = await import('../services/projectService')
    await deleteProjectPost(project.id, post.id)
  }

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-author-info">
          {post.authorPhoto ? (
            <img src={post.authorPhoto} alt="" className="post-avatar-img" />
          ) : (
            <div className="post-avatar">{authorInitial}</div>
          )}
          <div>
            <p className="post-author">{post.authorName || 'Voyageur'}</p>
            {!editing && post.location && (
              <p className="post-location">
                &#128205; {post.location}
                {post.country && ` \u2014 ${post.country}`}
              </p>
            )}
          </div>
        </div>
        <div className="post-header-right">
          {postDate && (
            <span className="post-date">
              {postDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          {canEdit && !demoMode && (
            <div className="item-menu-wrap">
              <button className="item-menu-btn" onClick={() => setShowMenu(!showMenu)}>&#8943;</button>
              {showMenu && (
                <div className="item-menu" onMouseLeave={() => setShowMenu(false)}>
                  <button onClick={() => { setEditing(true); setShowMenu(false) }}>Modifier</button>
                  <button className="item-menu-danger" onClick={() => { handleDelete(); setShowMenu(false) }}>Supprimer</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="edit-post-form">
          <textarea
            className="edit-textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="edit-post-fields">
            <input
              type="text"
              className="edit-inline-input"
              placeholder="Lieu"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
            />
            <input
              type="text"
              className="edit-inline-input"
              placeholder="Pays"
              value={editCountry}
              onChange={(e) => setEditCountry(e.target.value)}
            />
          </div>
          <div className="edit-inline-actions">
            <button className="edit-save-btn" onClick={handleSaveEdit}>Enregistrer</button>
            <button className="edit-cancel-btn" onClick={() => { setEditing(false); setEditText(post.text); setEditLocation(post.location || ''); setEditCountry(post.country || '') }}>Annuler</button>
          </div>
        </div>
      ) : (
        <p className="post-text">{post.text}</p>
      )}

      {!editing && post.media && post.media.length > 0 && (
        <div className={`post-media ${post.media.length > 1 ? 'grid' : ''}`}>
          {post.media.map((m, i) => (
            m.type === 'video'
              ? <video key={i} src={m.url} controls className="media-item" />
              : <img key={i} src={m.url} alt="" className="media-item" loading="lazy" />
          ))}
        </div>
      )}

      <div className="post-actions">
        <button className={`action-btn like-btn ${hasLiked ? 'liked' : ''}`} onClick={handleLike}>
          <span>{hasLiked ? '\u2764' : '\u2661'}</span>
          <span>{demoMode ? localLikes : (post.likesCount || 0)}</span>
        </button>
        <button className="action-btn comment-btn" onClick={() => setShowComments(!showComments)}>
          <span>&#128172;</span>
          <span>{post.commentsCount || 0}</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.length === 0 && <p className="no-comments">Aucun commentaire</p>}
          {comments.map((c) => (
            <Comment key={c.id} comment={c} postId={post.id} demoMode={demoMode} />
          ))}

          {user && (
            <form className="comment-form" onSubmit={handleComment}>
              <input
                type="text"
                placeholder="\u00C9crire un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="comment-input"
              />
              <button type="submit" className="comment-submit" disabled={isSubmitting || !newComment.trim()}>
                &#10148;
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// Feed principal
const Feed = ({ demoMode = false, demoPosts = [] }) => {
  const { project } = useProject()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(!demoMode)

  useEffect(() => {
    if (demoMode) {
      setPosts(demoPosts)
      setLoading(false)
      return
    }

    if (!project) return

    let unsubscribe = () => {}
    const init = async () => {
      const { subscribeToProjectPosts } = await import('../services/projectService')
      unsubscribe = subscribeToProjectPosts(project.id, (fetchedPosts) => {
        setPosts(fetchedPosts)
        setLoading(false)
      })
    }
    init()
    return () => unsubscribe()
  }, [demoMode, project?.id])

  if (loading) {
    return (
      <div className="feed-section">
        <h2 className="section-title">Journal de voyage</h2>
        <div className="feed-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-section">
      <h2 className="section-title">Journal de voyage</h2>
      {posts.length === 0 ? (
        <div className="feed-empty">
          <p>Aucun post pour le moment. L'aventure commence bient&ocirc;t !</p>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} demoMode={demoMode} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Feed
