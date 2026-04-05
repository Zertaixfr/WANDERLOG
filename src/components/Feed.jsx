// Feed / Journal — affiche les posts du voyage avec likes et commentaires
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToPosts, toggleLike, addComment, subscribeToComments } from '../services/postService'

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
const PostCard = ({ post }) => {
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasLiked = post.likes?.includes(user?.uid)
  const postDate = post.createdAt?.toDate?.()

  // Écouter les commentaires quand la section est ouverte
  useEffect(() => {
    if (!showComments) return
    const unsubscribe = subscribeToComments(post.id, setComments)
    return () => unsubscribe()
  }, [showComments, post.id])

  const handleLike = async () => {
    if (!user) return
    await toggleLike(post.id, user.uid)
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user || isSubmitting) return
    setIsSubmitting(true)
    try {
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
          <span>{post.likesCount || 0}</span>
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
const Feed = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToPosts((fetchedPosts) => {
      setPosts(fetchedPosts)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

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
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

export { Feed, PostCard }
export default Feed
