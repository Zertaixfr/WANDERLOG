// Globe 3D interactif avec Three.js — affiche les étapes du voyage
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Convertir lat/lng en coordonnées 3D sur une sphère
const latLngToVector3 = (lat, lng, radius) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Créer un arc entre deux points sur le globe
const createArc = (start, end, radius) => {
  const points = []
  const arcHeight = start.distanceTo(end) * 0.4
  for (let i = 0; i <= 50; i++) {
    const t = i / 50
    const point = new THREE.Vector3().lerpVectors(start, end, t)
    point.normalize().multiplyScalar(radius + Math.sin(Math.PI * t) * arcHeight)
    points.push(point)
  }
  return points
}

const Globe3D = ({ travelerStatus, posts = [] }) => {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const [selectedStop, setSelectedStop] = useState(null)

  // Étapes du voyage — extraites des posts ou données statiques
  const stops = posts
    .filter((p) => p.coordinates)
    .map((p) => ({
      name: p.location || p.country || 'Inconnu',
      lat: p.coordinates.latitude,
      lng: p.coordinates.longitude,
      country: p.country || '',
    }))

  // Position actuelle du voyageur
  const currentPosition = travelerStatus
    ? { lat: travelerStatus.latitude, lng: travelerStatus.longitude }
    : null

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Scène
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Caméra
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 4

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Globe — sphère sombre avec wireframe ambre
    const globeRadius = 1.5
    const globeGeometry = new THREE.SphereGeometry(globeRadius, 48, 48)

    // Sphère de base (sombre)
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0a1a,
      transparent: true,
      opacity: 0.9,
    })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    // Wireframe ambre
    const wireframeGeometry = new THREE.SphereGeometry(globeRadius + 0.002, 32, 32)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial)
    scene.add(wireframe)

    // Halo atmosphérique
    const haloGeometry = new THREE.SphereGeometry(globeRadius + 0.15, 48, 48)
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    })
    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    scene.add(halo)

    // Groupe pour les marqueurs et arcs (tourne avec le globe)
    const markersGroup = new THREE.Group()
    scene.add(markersGroup)

    // Marqueurs pour chaque étape
    stops.forEach((stop) => {
      const pos = latLngToVector3(stop.lat, stop.lng, globeRadius + 0.02)

      // Point du marqueur
      const markerGeometry = new THREE.SphereGeometry(0.025, 16, 16)
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf97316 })
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.copy(pos)
      marker.userData = { name: stop.name, country: stop.country }
      markersGroup.add(marker)

      // Halo autour du marqueur
      const glowGeometry = new THREE.SphereGeometry(0.04, 16, 16)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.3,
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.copy(pos)
      markersGroup.add(glow)
    })

    // Arcs entre les étapes consécutives
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, globeRadius + 0.02)
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, globeRadius + 0.02)
      const arcPoints = createArc(start, end, globeRadius)
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints)
      const arcMaterial = new THREE.LineBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.5,
      })
      const arc = new THREE.Line(arcGeometry, arcMaterial)
      markersGroup.add(arc)
    }

    // Pulse animé sur la position actuelle
    let pulseMarker = null
    let pulseGlow = null
    if (currentPosition) {
      const pos = latLngToVector3(currentPosition.lat, currentPosition.lng, globeRadius + 0.02)

      pulseMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      )
      pulseMarker.position.copy(pos)
      markersGroup.add(pulseMarker)

      pulseGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          transparent: true,
          opacity: 0.4,
        })
      )
      pulseGlow.position.copy(pos)
      markersGroup.add(pulseGlow)
    }

    // Contrôles de rotation (drag to rotate)
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let autoRotate = true
    let rotationVelocity = { x: 0, y: 0 }

    const onMouseDown = (e) => {
      isDragging = true
      autoRotate = false
      previousMousePosition = {
        x: e.clientX || e.touches?.[0]?.clientX || 0,
        y: e.clientY || e.touches?.[0]?.clientY || 0,
      }
    }

    const onMouseMove = (e) => {
      if (!isDragging) return
      const x = e.clientX || e.touches?.[0]?.clientX || 0
      const y = e.clientY || e.touches?.[0]?.clientY || 0
      const deltaX = x - previousMousePosition.x
      const deltaY = y - previousMousePosition.y

      rotationVelocity = { x: deltaY * 0.005, y: deltaX * 0.005 }
      globe.rotation.y += deltaX * 0.005
      globe.rotation.x += deltaY * 0.005
      wireframe.rotation.y = globe.rotation.y
      wireframe.rotation.x = globe.rotation.x
      markersGroup.rotation.y = globe.rotation.y
      markersGroup.rotation.x = globe.rotation.x

      previousMousePosition = { x, y }
    }

    const onMouseUp = () => {
      isDragging = false
      // Reprendre l'auto-rotation après 3 secondes
      setTimeout(() => { autoRotate = true }, 3000)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('touchstart', onMouseDown)
    renderer.domElement.addEventListener('touchmove', onMouseMove)
    renderer.domElement.addEventListener('touchend', onMouseUp)

    // Raycaster pour détecter les clics sur les marqueurs
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(markersGroup.children)

      if (intersects.length > 0 && intersects[0].object.userData.name) {
        setSelectedStop(intersects[0].object.userData)
        setTimeout(() => setSelectedStop(null), 3000)
      }
    }

    renderer.domElement.addEventListener('click', onClick)

    // Boucle d'animation
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01

      // Auto-rotation
      if (autoRotate) {
        globe.rotation.y += 0.002
        wireframe.rotation.y = globe.rotation.y
        markersGroup.rotation.y = globe.rotation.y
      }

      // Animation du pulse sur la position actuelle
      if (pulseGlow) {
        const scale = 1 + Math.sin(time * 3) * 0.4
        pulseGlow.scale.set(scale, scale, scale)
        pulseGlow.material.opacity = 0.2 + Math.sin(time * 3) * 0.2
      }

      renderer.render(scene, camera)
    }
    animate()

    // Redimensionnement
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Nettoyage
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('touchstart', onMouseDown)
      renderer.domElement.removeEventListener('touchmove', onMouseMove)
      renderer.domElement.removeEventListener('touchend', onMouseUp)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [stops.length, currentPosition?.lat, currentPosition?.lng])

  return (
    <div className="globe-section">
      <h2 className="section-title">Mon parcours</h2>
      <div className="globe-container" ref={mountRef}>
        {selectedStop && (
          <div className="globe-tooltip">
            <span className="tooltip-name">{selectedStop.name}</span>
            {selectedStop.country && (
              <span className="tooltip-country">{selectedStop.country}</span>
            )}
          </div>
        )}
      </div>

      {/* Légende des étapes */}
      {stops.length > 0 && (
        <div className="globe-legend">
          {stops.map((stop, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" />
              <span className="legend-name">{stop.name}</span>
            </div>
          ))}
          {currentPosition && (
            <div className="legend-item current">
              <span className="legend-dot current" />
              <span className="legend-name">Position actuelle</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Globe3D
