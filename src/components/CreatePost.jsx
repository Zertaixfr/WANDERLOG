// Formulaire de création de post — réservé au propriétaire du projet
import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'

// Compresser une image avant upload
const compressImage = (file, maxSize = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return }
    if (file.size < 500000) { resolve(file); return }
    const img = new Image()
    const canvas = document.createElement('canvas')
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > h && w > maxSize) { h = h * maxSize / w; w = maxSize }
      else if (h > maxSize) { w = w * maxSize / h; h = maxSize }
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

const CreatePost = () => {
  const { user } = useAuth()
  const { project, isOwner } = useProject()
  const [text, setText] = useState('')
  const [location, setLocation] = useState('')
  const [country, setCountry] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [files, setFiles] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Seul le propriétaire peut créer des posts
  if (!isOwner) return null

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles((prev) => [...prev, ...selectedFiles])
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getCurrentPosition = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
      (err) => console.error('Erreur GPS:', err)
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError('')
    try {
      const { createProjectPost } = await import('../services/projectService')
      await createProjectPost(project.id, {
        text: text.trim(),
        location: location.trim(),
        country: country.trim(),
        coordinates: lat && lng
          ? { latitude: parseFloat(lat), longitude: parseFloat(lng) }
          : null,
        authorId: user.uid,
        authorName: user.displayName || 'Voyageur',
      }, await Promise.all(files.map(f => compressImage(f))))

      setText('')
      setLocation('')
      setCountry('')
      setLat('')
      setLng('')
      setFiles([])
      setIsOpen(false)
    } catch (err) {
      console.error('Erreur lors de la création du post:', err)
      setError('Erreur : ' + (err.code || err.message || 'inconnue'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-post">
      {!isOpen ? (
        <button className="create-post-toggle" onClick={() => setIsOpen(true)}>
          &#43; Nouveau post
        </button>
      ) : (
        <form className="create-post-form" onSubmit={handleSubmit}>
          <h3 className="create-post-title">Nouveau post</h3>

          <textarea
            placeholder="Raconte ton aventure..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="create-post-textarea"
            rows={4}
            required
          />

          <div className="create-post-fields">
            <input type="text" placeholder="Lieu" value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" />
            <input type="text" placeholder="Pays" value={country} onChange={(e) => setCountry(e.target.value)} className="form-input" />
          </div>

          <div className="create-post-fields">
            <input type="number" step="any" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="form-input" />
            <input type="number" step="any" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className="form-input" />
            <button type="button" className="gps-btn" onClick={getCurrentPosition} title="Ma position">&#128205;</button>
          </div>

          <div className="media-upload">
            <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              &#128247; Photos/vid&eacute;os
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            {files.length > 0 && (
              <div className="upload-preview">
                {files.map((f, i) => (
                  <div key={i} className="preview-item">
                    <span className="preview-name">{f.name}</span>
                    <button type="button" className="preview-remove" onClick={() => removeFile(i)}>&#10005;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="create-post-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsOpen(false)}>Annuler</button>
            <button type="submit" className="submit-btn" disabled={isSubmitting || !text.trim()}>
              {isSubmitting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default CreatePost
