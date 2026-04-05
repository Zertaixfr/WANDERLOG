// Contexte de projet — gère le projet actif et le rôle de l'utilisateur
import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ProjectContext = createContext(null)

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject doit être utilisé dans un ProjectProvider')
  }
  return context
}

export const ProjectProvider = ({ children }) => {
  const { user, demoMode } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  // Charger le dernier projet depuis localStorage
  useEffect(() => {
    if (!user) {
      setProject(null)
      setLoading(false)
      return
    }

    if (demoMode) {
      // Mode démo — projet fictif
      setProject({
        id: 'demo-project',
        name: 'Tour du monde de Kilian',
        description: 'De Lisbonne à Tokyo, en passant par l\'Asie du Sud-Est',
        travelerName: 'Kilian',
        code: 'DEMO42',
        ownerId: user.uid,
        members: [user.uid],
      })
      setLoading(false)
      return
    }

    // Récupérer le dernier projet utilisé
    const savedProjectId = localStorage.getItem(`wanderlog_project_${user.uid}`)
    if (savedProjectId) {
      // Charger le projet sauvegardé
      const loadProject = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('../services/firebase')
          const projectDoc = await getDoc(doc(db, 'projects', savedProjectId))
          if (projectDoc.exists()) {
            const data = projectDoc.data()
            if (data.members?.includes(user.uid)) {
              setProject({ id: projectDoc.id, ...data })
            }
          }
        } catch (err) {
          console.error('Erreur chargement projet:', err)
        }
        setLoading(false)
      }
      loadProject()
    } else {
      setLoading(false)
    }
  }, [user, demoMode])

  // Sélectionner un projet
  const selectProject = (proj) => {
    setProject(proj)
    if (user && proj) {
      localStorage.setItem(`wanderlog_project_${user.uid}`, proj.id)
    }
  }

  // Quitter le projet actuel
  const leaveProject = () => {
    if (user) {
      localStorage.removeItem(`wanderlog_project_${user.uid}`)
    }
    setProject(null)
  }

  // L'utilisateur est-il le propriétaire (créateur) du projet ?
  const isOwner = project?.ownerId === user?.uid

  const value = {
    project,
    isOwner,
    loading,
    selectProject,
    leaveProject,
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}
