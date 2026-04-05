// Formulaire de création de post — réservé à l'admin (Kilian)
import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createPost } from '../services/postService'

const CreatePost = () => {
  const { isAdmin } = useAuth()
  const [text, setText] = useState('')
  const [location, setLocation] = useState('')
  const [country, setCountry] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [files, setFiles] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef(null)

  // Seul l'admin peut créer des posts
  if (!isAdmin) return null

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles((prev) => [...prev, ...selectedFiles])
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Récupérer la position GPS actuelle
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
    try {
      const postData = {
        text: text.trim(),
        location: location.trim(),
        country: country.trim(),
        coordinates: lat && lng
          ? { latitude: parseFloat(lat), longitude: parseFloat(lng) }
          : null,
      }

      await createPost(postData, files)

      // Réinitialiser le formulaire
      setText('')
      setLocation('')
      setCountry('')
      setLat('')
      setLng('')
      setFiles([])
      setIsOpen(false)
    } catch (err) {
      console.error('Erreur lors de la création du post:', err)
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
            <input
              type="text"
              placeholder="Lieu (ex: Tokyo)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Pays (ex: Japon)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Coordonnées GPS */}
          <div className="create-post-fields">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="form-input"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="form-input"
            />
            <button
              type="button"
              className="gps-btn"
              onClick={getCurrentPosition}
              title="Utiliser ma position"
            >
              &#128205;
            </button>
          </div>

          {/* Upload de médias */}
          <div className="media-upload">
            <button
              type="button"
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              &#128247; Ajouter des photos/vidéos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {files.length > 0 && (
              <div className="upload-preview">
                {files.map((f, i) => (
                  <div key={i} className="preview-item">
                    <span className="preview-name">{f.name}</span>
                    <button
                      type="button"
                      className="preview-remove"
                      onClick={() => removeFile(i)}
                    >
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="create-post-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setIsOpen(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default CreatePost
