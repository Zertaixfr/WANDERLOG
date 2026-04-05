// Feed / Journal — affiche les posts du voyage avec likes et commentaires
// Supporte le mode démo avec données mock
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isFirebaseConfigured } from '../services/firebase'
import { DEMO_COMMENTS } from '../services/demoData'

// Composant pour un commentaire individuel
const Comment = ({ comment }) => {
  const date = comment.createdAt?.toDate?.()
  return (
    <div className="comment">
      <span className="comment-author">{comment.userName}</span>
      <span className="comment-text">{comment.text}</span>
      {date && (
        <span className="comment-date">
          {date.toLocaleDateString('fr-FR')}
        </span>
      )}
    </div>
  )
}

// Composant pour un post individuel
const PostCard = ({ post, demoMode }) => {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [localLikes, setLocalLikes] = useState(post.likesCount || 0)
  const [hasLiked, setHasLiked] = useState(post.likes?.includes(user?.uid))
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const postDate = post.createdAt?.toDate?.()

  // Charger les commentaires quand la section est ouverte
  useEffect(() => {
    if (!showComments) return

    if (demoMode) {
      // Mode démo — commentaires statiques
      setComments(DEMO_COMMENTS[post.id] || [])
      return
    }

    // Mode Firebase — écoute temps réel
    let unsubscribe = () => {}
    const init = async () => {
      const { subscribeToComments } = await import('../services/postService')
      unsubscribe = subscribeToComments(post.id, setComments)
    }
    init()
    return () => unsubscribe()
  }, [showComments, post.id, demoMode])

  const handleLike = async () => {
    if (!user) return

    if (demoMode) {
      // Mode démo — like local
      setHasLiked(!hasLiked)
      setLocalLikes((prev) => prev + (hasLiked ? -1 : 1))
      return
    }

    const { toggleLike } = await import('../services/postService')
    await toggleLike(post.id, user.uid)
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user || isSubmitting) return
    setIsSubmitting(true)

    if (demoMode) {
      // Mode démo — ajouter le commentaire localement
      setComments((prev) => [
        ...prev,
        {
          id: `demo-${Date.now()}`,
          text: newComment.trim(),
          userName: user.displayName || 'Voyageur',
          userId: user.uid,
          createdAt: { toDate: () => new Date() },
        },
      ])
      setNewComment('')
      setIsSubmitting(false)
      return
    }

    try {
      const { addComment } = await import('../services/postService')
      await addComment(post.id, {
        text: newComment.trim(),
        userId: user.uid,
        userName: user.displayName || 'Anonyme',
      })
      setNewComment('')
    } catch (err) {
      console.error('Erreur lors de l\'ajout du commentaire:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="post-card">
      {/* En-tête du post */}
      <div className="post-header">
        <div className="post-author-info">
          <div className="post-avatar">K</div>
          <div>
            <p className="post-author">Kilian</p>
            {post.location && (
              <p className="post-location">
                &#128205; {post.location}
                {post.country && ` — ${post.country}`}
              </p>
            )}
          </div>
        </div>
        {postDate && (
          <span className="post-date">
            {postDate.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Contenu texte */}
      <p className="post-text">{post.text}</p>

      {/* Médias (photos/vidéos) */}
      {post.media && post.media.length > 0 && (
        <div className={`post-media ${post.media.length > 1 ? 'grid' : ''}`}>
          {post.media.map((m, i) => (
            m.type === 'video' ? (
              <video key={i} src={m.url} controls className="media-item" />
            ) : (
              <img key={i} src={m.url} alt="" className="media-item" loading="lazy" />
            )
          ))}
        </div>
      )}

      {/* Actions (like + commentaires) */}
      <div className="post-actions">
        <button
          className={`action-btn like-btn ${hasLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <span>{hasLiked ? '&#10084;' : '&#9825;'}</span>
          <span>{demoMode ? localLikes : (post.likesCount || 0)}</span>
        </button>
        <button
          className="action-btn comment-btn"
          onClick={() => setShowComments(!showComments)}
        >
          <span>&#128172;</span>
          <span>{post.commentsCount || 0}</span>
        </button>
      </div>

      {/* Section commentaires dépliable */}
      {showComments && (
        <div className="comments-section">
          {comments.length === 0 && (
            <p className="no-comments">Aucun commentaire pour l'instant</p>
          )}
          {comments.map((c) => (
            <Comment key={c.id} comment={c} />
          ))}

          {/* Formulaire de commentaire */}
          {user && (
            <form className="comment-form" onSubmit={handleComment}>
              <input
                type="text"
                placeholder="Écrire un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="comment-input"
              />
              <button
                type="submit"
                className="comment-submit"
                disabled={isSubmitting || !newComment.trim()}
              >
                &#10148;
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// Composant Feed principal
const Feed = ({ demoMode = false, demoPosts = [] }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(!demoMode)

  useEffect(() => {
    if (demoMode) {
      setPosts(demoPosts)
      setLoading(false)
      return
    }

    // Mode Firebase
    let unsubscribe = () => {}
    const init = async () => {
      const { subscribeToPosts } = await import('../services/postService')
      unsubscribe = subscribeToPosts((fetchedPosts) => {
        setPosts(fetchedPosts)
        setLoading(false)
      })
    }
    init()
    return () => unsubscribe()
  }, [demoMode])

  if (loading) {
    return (
      <div className="feed-section">
        <h2 className="section-title">Journal de voyage</h2>
        <div className="feed-loading">
          <div className="loading-spinner" />
          <p>Chargement des posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-section">
      <h2 className="section-title">Journal de voyage</h2>
      {posts.length === 0 ? (
        <div className="feed-empty">
          <p>Aucun post pour le moment. L'aventure commence bientôt !</p>
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

export { Feed, PostCard }
export default Feed
