// Formulaire d'ajout d'étape/trajet — réservé au propriétaire du projet
import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'

const AddTrip = ({ onTripAdded }) => {
  const { project, isOwner } = useProject()
  const [isOpen, setIsOpen] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOwner) return null

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
    if (!city.trim() || !lat || !lng || submitting) return
    setSubmitting(true)

    try {
      const { addTrip } = await import('../services/projectService')
      await addTrip(project.id, {
        city: city.trim(),
        country: country.trim(),
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        arrivalDate: arrivalDate || null,
        notes: notes.trim(),
      })

      // Reset
      setCity('')
      setCountry('')
      setLat('')
      setLng('')
      setArrivalDate('')
      setNotes('')
      setIsOpen(false)
      if (onTripAdded) onTripAdded()
    } catch (err) {
      console.error('Erreur ajout étape:', err)
    }
    setSubmitting(false)
  }

  return (
    <div className="add-trip">
      {!isOpen ? (
        <button className="add-trip-toggle" onClick={() => setIsOpen(true)}>
          &#43; Ajouter une &eacute;tape
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
            <button type="button" className="gps-btn" onClick={getCurrentPosition} title="Ma position">
              &#128205;
            </button>
          </div>

          <div className="create-post-fields">
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="form-input"
              placeholder="Date d'arrivée"
            />
          </div>

          <textarea
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="create-post-textarea"
            rows={2}
          />

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
