// Formulaire d'ajout d'étape/trajet — réservé au propriétaire du projet
import { useState, useRef } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'

// Compresser une image avant upload (max 800px, qualité 0.7)
const compressImage = (file, maxSize = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    // Si ce n'est pas une image, retourner tel quel
    if (!file.type.startsWith('image/')) { resolve(file); return }
    // Si déjà petit (< 500KB), pas besoin
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

const AddTrip = ({ onTripAdded }) => {
  const { project, isOwner } = useProject()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  if (!isOwner) return null

  const [gpsLoading, setGpsLoading] = useState(false)

  const getCurrentPosition = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    // D'abord une position rapide (basse précision)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)))
        setLng(String(pos.coords.longitude.toFixed(6)))
        setGpsLoading(false)
      },
      (err) => {
        console.error('Erreur GPS:', err)
        setGpsLoading(false)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    // Max 6 photos par étape
    const remaining = 6 - photos.length
    const newFiles = files.slice(0, remaining)

    setPhotos((prev) => [...prev, ...newFiles])
    newFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreviews((prev) => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!city.trim() || !lat || !lng || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const { addTrip } = await import('../services/projectService')
      // Compresser toutes les photos avant upload
      const compressedPhotos = await Promise.all(
        photos.map((p) => compressImage(p))
      )
      await addTrip(project.id, {
        city: city.trim(),
        country: country.trim(),
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        arrivalDate: arrivalDate || null,
        notes: notes.trim(),
      }, compressedPhotos, user?.uid)

      // Reset
      setCity('')
      setCountry('')
      setLat('')
      setLng('')
      setArrivalDate('')
      setNotes('')
      setPhotos([])
      setPhotoPreviews([])
      setIsOpen(false)
      if (onTripAdded) onTripAdded()
    } catch (err) {
      console.error('Erreur ajout étape:', err)
      setError('Erreur : ' + (err.code || err.message || 'inconnue'))
    }
    setSubmitting(false)
  }

  return (
    <div className="add-trip">
      {!isOpen ? (
        <button className="add-trip-toggle" onClick={() => setIsOpen(true)}>
          + Ajouter une &eacute;tape
        </button>
      ) : (
        <form className="add-trip-form" onSubmit={handleSubmit}>
          <h3 className="create-post-title">Nouvelle &eacute;tape</h3>

          <div className="create-post-fields">
            <input
              type="text"
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="form-input"
              required
            />
            <input
              type="text"
              placeholder="Pays"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="create-post-fields">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="form-input"
              required
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="form-input"
              required
            />
            <button type="button" className="gps-btn" onClick={getCurrentPosition} title="Ma position" disabled={gpsLoading}>
              {gpsLoading ? '...' : '\u{1F4CD}'}
            </button>
          </div>

          <div className="create-post-fields">
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="form-input"
              placeholder="Date d'arriv&eacute;e"
            />
          </div>

          {/* Upload photos (jusqu'à 6) */}
          <div className="trip-photo-upload">
            {photoPreviews.length > 0 && (
              <div className="trip-photos-grid">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="trip-photo-preview">
                    <img src={preview} alt={`Photo ${i + 1}`} />
                    <button type="button" className="trip-photo-remove" onClick={() => removePhoto(i)}>&times;</button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 6 && (
              <label className="trip-photo-label">
                <span className="trip-photo-icon">&#128247;</span>
                <span>{photos.length === 0 ? 'Ajouter des photos' : `Ajouter (${photos.length}/6)`}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  hidden
                />
              </label>
            )}
          </div>

          <textarea
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="create-post-textarea"
            rows={2}
          />

          {error && <p className="auth-error">{error}</p>}

          <div className="create-post-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="submit-btn" disabled={submitting || !city.trim() || !lat || !lng}>
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AddTrip
