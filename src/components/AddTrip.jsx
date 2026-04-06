// Formulaire d'ajout d'étape/trajet — réservé au propriétaire du projet
import { useState, useRef } from 'react'
import { useProject } from '../contexts/ProjectContext'

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
  const [isOpen, setIsOpen] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
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
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!city.trim() || !lat || !lng || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const { addTrip } = await import('../services/projectService')
      // Compresser la photo avant upload
      const compressedPhoto = photo ? await compressImage(photo) : null
      await addTrip(project.id, {
        city: city.trim(),
        country: country.trim(),
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        arrivalDate: arrivalDate || null,
        notes: notes.trim(),
      }, compressedPhoto)

      // Reset
      setCity('')
      setCountry('')
      setLat('')
      setLng('')
      setArrivalDate('')
      setNotes('')
      setPhoto(null)
      setPhotoPreview(null)
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

          {/* Upload photo */}
          <div className="trip-photo-upload">
            {photoPreview ? (
              <div className="trip-photo-preview">
                <img src={photoPreview} alt="Aper&ccedil;u" />
                <button type="button" className="trip-photo-remove" onClick={removePhoto}>&times;</button>
              </div>
            ) : (
              <label className="trip-photo-label">
                <span className="trip-photo-icon">&#128247;</span>
                <span>Ajouter une photo</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
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
