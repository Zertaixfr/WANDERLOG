// Écran de connexion / inscription avec photo de profil
import { useState, useRef } from 'react'

// Compresser photo de profil en base64 (petite, carrée)
const compressAvatar = (file) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const size = 200
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // Crop carré centré
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { loginUser } = await import('../services/authService')
        await loginUser(email, password)
      } else {
        if (!firstName.trim()) {
          setError('Le pr\u00e9nom est requis')
          setLoading(false)
          return
        }
        // Compresser la photo si fournie
        let avatarBase64 = null
        if (photo) {
          avatarBase64 = await compressAvatar(photo)
        }
        const { registerUser } = await import('../services/authService')
        await registerUser(email, password, firstName.trim(), avatarBase64)
      }
    } catch (err) {
      const errorMessages = {
        'auth/email-already-in-use': 'Cet email est d\u00e9j\u00e0 utilis\u00e9',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caract\u00e8res',
        'auth/user-not-found': 'Aucun compte trouv\u00e9 avec cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/invalid-credential': 'Identifiants invalides',
        'auth/too-many-requests': 'Trop de tentatives, r\u00e9essayez plus tard',
      }
      console.error('Erreur Firebase Auth:', err.code, err.message)
      setError(errorMessages[err.code] || `Erreur : ${err.code || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">&#9992;</span>
          </div>
          <h1 className="auth-title">Wanderlog</h1>
          <p className="auth-subtitle">Suivez mon tour du monde en temps r&eacute;el</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-toggle">
            <button
              type="button"
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError('') }}
            >
              Connexion
            </button>
            <button
              type="button"
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError('') }}
            >
              Inscription
            </button>
          </div>

          {/* Inscription : photo + prénom */}
          {!isLogin && (
            <>
              <div className="avatar-upload" onClick={() => fileRef.current?.click()}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Photo" className="avatar-preview" />
                ) : (
                  <div className="avatar-placeholder">
                    <span className="avatar-icon">&#128247;</span>
                    <span className="avatar-text">Photo</span>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  hidden
                />
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Pr&eacute;nom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              minLength={6}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? 'Chargement...'
              : isLogin
                ? 'Se connecter'
                : 'Cr\u00e9er un compte'}
          </button>
        </form>

        <p className="auth-footer">
          Rejoignez l'aventure et suivez chaque &eacute;tape du voyage
        </p>
      </div>
    </div>
  )
}

export default AuthScreen
