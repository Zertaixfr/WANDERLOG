// Paramètres — profil, projet, préférences
import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useTheme } from '../contexts/ThemeContext'

// Compresser avatar
const compressAvatar = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) { resolve(null); return }
    const img = new Image()
    img.onload = () => {
      const size = 200
      let w = img.width, h = img.height
      if (w > h) { const off = (w - h) / 2; w = h; img._sx = off } else { const off = (h - w) / 2; h = w; img._sy = off }
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      canvas.getContext('2d').drawImage(img, img._sx || 0, img._sy || 0, Math.min(img.width, img.height), Math.min(img.width, img.height), 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(null)
    img._sx = 0; img._sy = 0
    img.src = URL.createObjectURL(file)
  })
}

const Settings = () => {
  const { user, userData, demoMode } = useAuth()
  const { project, isOwner, leaveProject } = useProject()
  const { isDark, toggleTheme } = useTheme()

  // Profil
  const [editName, setEditName] = useState(user?.displayName || '')
  const [newPhoto, setNewPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const photoRef = useRef(null)

  // Mot de passe
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  // Projet
  const [editProjectName, setEditProjectName] = useState(project?.name || '')
  const [editProjectDesc, setEditProjectDesc] = useState(project?.description || '')
  const [editTravelerName, setEditTravelerName] = useState(project?.travelerName || '')
  const [projectSaving, setProjectSaving] = useState(false)
  const [projectMsg, setProjectMsg] = useState('')
  const [codeMsg, setCodeMsg] = useState('')

  // --- Handlers ---

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (demoMode || profileSaving) return
    setProfileSaving(true)
    setProfileMsg('')
    try {
      const { updateProfile } = await import('firebase/auth')
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db, auth } = await import('../services/firebase')

      // Mettre à jour le nom
      if (editName.trim() && editName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() })
      }

      // Mettre à jour la photo
      let photoBase64 = userData?.photoBase64 || null
      if (newPhoto) {
        photoBase64 = await compressAvatar(newPhoto)
      }

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName.trim(),
        photoBase64,
      })

      setProfileMsg('Profil mis \u00e0 jour !')
      setNewPhoto(null)
      setTimeout(() => setProfileMsg(''), 3000)
    } catch (err) {
      setProfileMsg('Erreur : ' + (err.message || 'inconnue'))
    }
    setProfileSaving(false)
  }

  const handleChangePassword = async () => {
    if (demoMode || pwSaving) return
    if (newPw.length < 6) { setPwMsg('6 caract\u00e8res minimum'); return }
    if (newPw !== confirmPw) { setPwMsg('Les mots de passe ne correspondent pas'); return }
    setPwSaving(true)
    setPwMsg('')
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth')
      const { auth } = await import('../services/firebase')
      const credential = EmailAuthProvider.credential(user.email, currentPw)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPw)
      setPwMsg('Mot de passe modifi\u00e9 !')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setPwMsg(''), 3000)
    } catch (err) {
      setPwMsg(err.code === 'auth/wrong-password' ? 'Mot de passe actuel incorrect' : 'Erreur : ' + (err.message || 'inconnue'))
    }
    setPwSaving(false)
  }

  const handleSaveProject = async () => {
    if (demoMode || projectSaving || !isOwner) return
    setProjectSaving(true)
    setProjectMsg('')
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('../services/firebase')
      await updateDoc(doc(db, 'projects', project.id), {
        name: editProjectName.trim(),
        description: editProjectDesc.trim(),
        travelerName: editTravelerName.trim(),
      })
      setProjectMsg('Carnet mis \u00e0 jour !')
      setTimeout(() => setProjectMsg(''), 3000)
    } catch (err) {
      setProjectMsg('Erreur : ' + (err.message || 'inconnue'))
    }
    setProjectSaving(false)
  }

  const handleRegenerateCode = async () => {
    if (demoMode || !isOwner) return
    if (!confirm('R\u00e9g\u00e9n\u00e9rer le code de partage ? L\u2019ancien ne fonctionnera plus.')) return
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('../services/firebase')
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
      await updateDoc(doc(db, 'projects', project.id), { code })
      setCodeMsg('Nouveau code : ' + code)
      setTimeout(() => setCodeMsg(''), 5000)
    } catch (err) {
      setCodeMsg('Erreur')
    }
  }

  const handleDeleteProject = async () => {
    if (demoMode || !isOwner) return
    if (!confirm(`Supprimer d\u00e9finitivement le carnet "${project.name}" ? Cette action est irr\u00e9versible.`)) return
    if (!confirm('Vraiment supprimer ? Tous les posts, \u00e9tapes et commentaires seront perdus.')) return
    try {
      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('../services/firebase')
      await deleteDoc(doc(db, 'projects', project.id))
      leaveProject()
    } catch (err) {
      alert('Erreur : ' + (err.message || 'inconnue'))
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (demoMode || !isOwner || memberId === user.uid) return
    if (!confirm('Retirer ce membre du carnet ?')) return
    try {
      const { doc, updateDoc, arrayRemove } = await import('firebase/firestore')
      const { db } = await import('../services/firebase')
      await updateDoc(doc(db, 'projects', project.id), {
        members: arrayRemove(memberId),
      })
    } catch (err) {
      alert('Erreur')
    }
  }

  return (
    <div className="settings-section">
      <h2 className="section-title">Param&egrave;tres</h2>

      {/* === APPARENCE === */}
      <div className="settings-card">
        <h3 className="settings-card-title">Apparence</h3>
        <div className="theme-toggle-row">
          <div className="theme-toggle-info">
            <span className="theme-toggle-icon">{isDark ? '\uD83C\uDF19' : '\u2600\uFE0F'}</span>
            <div>
              <span className="theme-toggle-label">{isDark ? 'Mode sombre' : 'Mode clair'}</span>
              <span className="theme-toggle-hint">Changer l'apparence de l'application</span>
            </div>
          </div>
          <button className={`theme-switch ${isDark ? '' : 'theme-switch-light'}`} onClick={toggleTheme}>
            <span className="theme-switch-thumb" />
          </button>
        </div>
      </div>

      {/* === PROFIL === */}
      <div className="settings-card">
        <h3 className="settings-card-title">Mon profil</h3>

        <div className="settings-profile-row">
          <div className="settings-avatar" onClick={() => photoRef.current?.click()}>
            {photoPreview || userData?.photoBase64 ? (
              <img src={photoPreview || userData.photoBase64} alt="" />
            ) : (
              <div className="settings-avatar-placeholder">
                {(user?.displayName || 'V')[0].toUpperCase()}
              </div>
            )}
            <div className="settings-avatar-overlay">&#128247;</div>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </div>
          <div className="settings-profile-info">
            <p className="settings-email">{user?.email}</p>
          </div>
        </div>

        <div className="settings-field">
          <label>Nom</label>
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="settings-input" />
        </div>

        {profileMsg && <p className={`settings-msg ${profileMsg.startsWith('Erreur') ? 'settings-msg-error' : ''}`}>{profileMsg}</p>}

        <button className="settings-save-btn" onClick={handleSaveProfile} disabled={profileSaving || demoMode}>
          {profileSaving ? 'Enregistrement...' : 'Enregistrer le profil'}
        </button>
      </div>

      {/* === MOT DE PASSE === */}
      {!demoMode && (
        <div className="settings-card">
          <h3 className="settings-card-title">Mot de passe</h3>
          <div className="settings-field">
            <label>Mot de passe actuel</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="settings-input" />
          </div>
          <div className="settings-field">
            <label>Nouveau mot de passe</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="settings-input" placeholder="6 caract\u00e8res minimum" />
          </div>
          <div className="settings-field">
            <label>Confirmer</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="settings-input" />
          </div>
          {pwMsg && <p className={`settings-msg ${pwMsg.startsWith('Erreur') || pwMsg.includes('incorrect') || pwMsg.includes('correspondent') || pwMsg.includes('minimum') ? 'settings-msg-error' : ''}`}>{pwMsg}</p>}
          <button className="settings-save-btn" onClick={handleChangePassword} disabled={pwSaving || !currentPw || !newPw}>
            {pwSaving ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>
      )}

      {/* === PARAMÈTRES DU CARNET === */}
      {isOwner && (
        <div className="settings-card">
          <h3 className="settings-card-title">Carnet de voyage</h3>
          <div className="settings-field">
            <label>Nom du carnet</label>
            <input type="text" value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} className="settings-input" />
          </div>
          <div className="settings-field">
            <label>Description</label>
            <textarea value={editProjectDesc} onChange={(e) => setEditProjectDesc(e.target.value)} className="settings-input settings-textarea" rows={2} />
          </div>
          <div className="settings-field">
            <label>Nom du voyageur</label>
            <input type="text" value={editTravelerName} onChange={(e) => setEditTravelerName(e.target.value)} className="settings-input" />
          </div>
          {projectMsg && <p className="settings-msg">{projectMsg}</p>}
          <button className="settings-save-btn" onClick={handleSaveProject} disabled={projectSaving || demoMode}>
            {projectSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* === CODE DE PARTAGE === */}
      {isOwner && (
        <div className="settings-card">
          <h3 className="settings-card-title">Code de partage</h3>
          <div className="settings-code-row">
            <span className="settings-code">{project?.code}</span>
            <button className="settings-secondary-btn" onClick={handleRegenerateCode} disabled={demoMode}>
              R&eacute;g&eacute;n&eacute;rer
            </button>
          </div>
          {codeMsg && <p className="settings-msg">{codeMsg}</p>}
          <p className="settings-hint">Partagez ce code pour que d'autres rejoignent votre carnet.</p>
        </div>
      )}

      {/* === MEMBRES === */}
      {isOwner && project?.members && (
        <div className="settings-card">
          <h3 className="settings-card-title">Membres ({project.members.length})</h3>
          <div className="settings-members-list">
            {project.members.map((memberId) => (
              <div key={memberId} className="settings-member">
                <div className="settings-member-avatar">
                  {memberId === user.uid ? (
                    userData?.photoBase64 ? <img src={userData.photoBase64} alt="" /> : (user?.displayName || 'V')[0].toUpperCase()
                  ) : (
                    '?'
                  )}
                </div>
                <div className="settings-member-info">
                  <span className="settings-member-name">
                    {memberId === user.uid ? (user?.displayName || 'Moi') : memberId.slice(0, 12) + '...'}
                  </span>
                  {memberId === project.ownerId && <span className="settings-owner-badge">Propri&eacute;taire</span>}
                </div>
                {memberId !== user.uid && (
                  <button className="settings-remove-btn" onClick={() => handleRemoveMember(memberId)} disabled={demoMode}>
                    Retirer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === ZONE DANGER === */}
      <div className="settings-card settings-danger-zone">
        <h3 className="settings-card-title">Zone danger</h3>
        <div className="settings-danger-actions">
          <button className="settings-danger-btn" onClick={leaveProject}>
            Quitter ce carnet
          </button>
          {isOwner && (
            <button className="settings-danger-btn settings-danger-delete" onClick={handleDeleteProject} disabled={demoMode}>
              Supprimer le carnet
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
