// Écran de connexion / inscription
import { useState } from 'react'
import { registerUser, loginUser } from '../services/authService'

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await loginUser(email, password)
      } else {
        if (!displayName.trim()) {
          setError('Le nom d\'affichage est requis')
          setLoading(false)
          return
        }
        await registerUser(email, password, displayName.trim())
      }
    } catch (err) {
      // Messages d'erreur en français
      const errorMessages = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/invalid-credential': 'Identifiants invalides',
        'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard',
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
        {/* Logo et titre */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">&#9992;</span>
          </div>
          <h1 className="auth-title">Wanderlog</h1>
          <p className="auth-subtitle">Suivez mon tour du monde en temps réel</p>
        </div>

        {/* Formulaire */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Toggle connexion / inscription */}
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

          {/* Champ nom (inscription uniquement) */}
          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                placeholder="Votre nom"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-input"
              />
            </div>
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
                : 'Créer un compte'}
          </button>
        </form>

        <p className="auth-footer">
          Rejoignez l'aventure et suivez chaque étape du voyage
        </p>
      </div>
    </div>
  )
}

export default AuthScreen
