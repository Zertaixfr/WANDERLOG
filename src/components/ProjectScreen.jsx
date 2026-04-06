// Écran de sélection de projet — Créer ou Rejoindre
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { isFirebaseConfigured } from '../services/firebase'

const ProjectScreen = () => {
  const { user, userData, demoMode } = useAuth()
  const { selectProject } = useProject()
  const [mode, setMode] = useState(null) // null, 'create', 'join'
  const [existingProjects, setExistingProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaire création
  const [projectName, setProjectName] = useState('')
  const [travelerName, setTravelerName] = useState(user?.displayName || '')
  const [description, setDescription] = useState('')

  // Formulaire rejoindre
  const [joinCode, setJoinCode] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdCode, setCreatedCode] = useState(null)

  // Charger les projets existants de l'utilisateur
  useEffect(() => {
    if (demoMode) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const { getUserProjects } = await import('../services/projectService')
        const projects = await getUserProjects(user.uid)
        setExistingProjects(projects)
      } catch (err) {
        console.error('Erreur chargement projets:', err)
        setError('Impossible de charger vos carnets')
      }
      setLoading(false)
    }
    load()
  }, [user, demoMode])

  // Créer un projet
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!projectName.trim()) return
    setError('')
    setSubmitting(true)

    try {
      const { createProject } = await import('../services/projectService')
      const project = await createProject(
        {
          name: projectName.trim(),
          travelerName: travelerName.trim(),
          description: description.trim(),
        },
        user.uid
      )
      if (!project) {
        setError('Erreur lors de la cr\u00e9ation')
        setSubmitting(false)
        return
      }
      setCreatedCode(project.code)
    } catch (err) {
      setError(err.message || 'Erreur lors de la cr\u00e9ation du carnet')
      console.error(err)
    }
    setSubmitting(false)
  }

  // Confirmer après avoir vu le code
  const handleConfirmCreate = async () => {
    // Recharger les projets pour trouver celui qu'on vient de créer
    const { getUserProjects } = await import('../services/projectService')
    const projects = await getUserProjects(user.uid)
    const newProject = projects.find((p) => p.code === createdCode)
    if (newProject) {
      selectProject(newProject)
    }
  }

  // Rejoindre un projet
  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setError('')
    setSubmitting(true)

    try {
      const { joinProject } = await import('../services/projectService')
      const project = await joinProject(joinCode.trim(), user.uid)
      if (!project) {
        setError('Code invalide ou erreur')
        setSubmitting(false)
        return
      }
      selectProject(project)
    } catch (err) {
      setError(err.message || 'Code invalide')
      console.error(err)
    }
    setSubmitting(false)
  }

  // Sélectionner un projet existant
  const handleSelectExisting = (proj) => {
    selectProject(proj)
  }

  if (loading) {
    return (
      <div className="project-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="project-screen">
      <div className="project-container">
        {/* En-tête */}
        <div className="project-header">
          {userData?.photoBase64 ? (
            <img src={userData.photoBase64} alt="" className="project-user-avatar" />
          ) : (
            <div className="project-logo">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.6" />
              </svg>
            </div>
          )}
          <h1 className="project-title">Wanderlog</h1>
          <p className="project-subtitle">
            {user?.displayName ? `Bienvenue ${user.displayName} !` : 'Cr\u00e9ez ou rejoignez un carnet de voyage'}
          </p>
        </div>

        {/* Erreur */}
        {error && !mode && !createdCode && <p className="auth-error" style={{ marginBottom: 16 }}>{error}</p>}

        {/* Projets existants */}
        {existingProjects.length > 0 && !mode && (
          <div className="existing-projects">
            <h3 className="existing-title">Vos carnets</h3>
            {existingProjects.map((proj) => (
              <button
                key={proj.id}
                className="existing-project-btn"
                onClick={() => handleSelectExisting(proj)}
              >
                <div className="ep-info">
                  <span className="ep-name">{proj.name}</span>
                  <span className="ep-code">Code : {proj.code}</span>
                </div>
                <span className="ep-arrow">&#8594;</span>
              </button>
            ))}
            <div className="existing-divider">
              <span>ou</span>
            </div>
          </div>
        )}

        {/* Choix initial */}
        {!mode && !createdCode && (
          <div className="project-choices">
            <button
              className="choice-btn create"
              onClick={() => setMode('create')}
            >
              <span className="choice-icon">&#43;</span>
              <span className="choice-label">Cr&eacute;er un carnet</span>
              <span className="choice-desc">Vous partez en voyage ? Cr&eacute;ez votre carnet et partagez-le</span>
            </button>
            <button
              className="choice-btn join"
              onClick={() => setMode('join')}
            >
              <span className="choice-icon">&#128279;</span>
              <span className="choice-label">Rejoindre un carnet</span>
              <span className="choice-desc">Entrez le code d'un voyageur pour suivre son aventure</span>
            </button>
          </div>
        )}

        {/* Formulaire création */}
        {mode === 'create' && !createdCode && (
          <form className="project-form" onSubmit={handleCreate}>
            <h3 className="form-title">Cr&eacute;er votre carnet de voyage</h3>

            <div className="form-group">
              <label className="form-label">Nom du voyage</label>
              <input
                type="text"
                placeholder="Ex: Tour du monde 2026"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Votre nom de voyageur</label>
              <input
                type="text"
                placeholder="Ex: Kilian"
                value={travelerName}
                onChange={(e) => setTravelerName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optionnel)</label>
              <textarea
                placeholder="D&eacute;crivez votre aventure..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input form-textarea"
                rows={3}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => { setMode(null); setError('') }}
              >
                Retour
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || !projectName.trim()}
              >
                {submitting ? 'Cr&eacute;ation...' : 'Cr&eacute;er le carnet'}
              </button>
            </div>
          </form>
        )}

        {/* Code créé — succès */}
        {createdCode && (
          <div className="code-success">
            <div className="code-check">&#10003;</div>
            <h3 className="code-title">Carnet cr&eacute;&eacute; !</h3>
            <p className="code-desc">Partagez ce code pour que vos proches puissent suivre votre voyage :</p>
            <div className="code-display">
              <span className="code-value">{createdCode}</span>
              <button
                className="code-copy"
                onClick={() => navigator.clipboard?.writeText(createdCode)}
              >
                Copier
              </button>
            </div>
            <button className="submit-btn code-continue" onClick={handleConfirmCreate}>
              Commencer l'aventure &#8594;
            </button>
          </div>
        )}

        {/* Formulaire rejoindre */}
        {mode === 'join' && (
          <form className="project-form" onSubmit={handleJoin}>
            <h3 className="form-title">Rejoindre un carnet</h3>
            <p className="form-desc">Entrez le code partag&eacute; par le voyageur</p>

            <div className="form-group">
              <input
                type="text"
                placeholder="Ex: ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="form-input code-input"
                maxLength={6}
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => { setMode(null); setError('') }}
              >
                Retour
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || joinCode.trim().length < 4}
              >
                {submitting ? 'Recherche...' : 'Rejoindre'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ProjectScreen
