// Globe 3D interactif — texture réaliste de la Terre
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Textures de la Terre (NASA / Natural Earth)
const EARTH_TEXTURE = 'https://unpkg.com/three-globe@2.35.0/example/img/earth-blue-marble.jpg'
const EARTH_BUMP = 'https://unpkg.com/three-globe@2.35.0/example/img/earth-topology.png'

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

// Créer un arc courbé entre deux points
const createArc = (start, end, radius) => {
  const points = []
  const arcHeight = start.distanceTo(end) * 0.4
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const point = new THREE.Vector3().lerpVectors(start, end, t)
    point.normalize().multiplyScalar(radius + Math.sin(Math.PI * t) * arcHeight)
    points.push(point)
  }
  return points
}

const Globe3D = ({ travelerStatus, posts = [] }) => {
  const mountRef = useRef(null)
  const [selectedStop, setSelectedStop] = useState(null)

  // Étapes du voyage
  const stops = posts
    .filter((p) => p.coordinates)
    .map((p) => ({
      name: p.location || p.country || 'Inconnu',
      lat: p.coordinates.latitude,
      lng: p.coordinates.longitude,
      country: p.country || '',
    }))

  // Position actuelle
  const currentPosition = travelerStatus
    ? { lat: travelerStatus.latitude, lng: travelerStatus.longitude }
    : null

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Scène avec fond transparent
    const scene = new THREE.Scene()

    // Caméra
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 3.8

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const globeRadius = 1.5
    const textureLoader = new THREE.TextureLoader()

    // Lumière ambiante douce
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    // Lumière directionnelle (effet soleil)
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 0.8)
    sunLight.position.set(5, 3, 5)
    scene.add(sunLight)

    // Globe terrestre avec texture
    const globeGeometry = new THREE.SphereGeometry(globeRadius, 64, 64)
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 15,
    })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    // Charger la texture de la Terre
    textureLoader.load(EARTH_TEXTURE, (texture) => {
      globeMaterial.map = texture
      globeMaterial.needsUpdate = true
    })

    // Charger le bump map (relief)
    textureLoader.load(EARTH_BUMP, (texture) => {
      globeMaterial.bumpMap = texture
      globeMaterial.bumpScale = 0.03
      globeMaterial.needsUpdate = true
    })

    // Halo atmosphérique bleu
    const haloGeometry = new THREE.SphereGeometry(globeRadius + 0.12, 48, 48)
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(haloGeometry, haloMaterial))

    // Deuxième halo plus diffus
    const halo2Geometry = new THREE.SphereGeometry(globeRadius + 0.22, 48, 48)
    const halo2Material = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.035,
      side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(halo2Geometry, halo2Material))

    // Groupe pour les marqueurs (tourne avec le globe)
    const markersGroup = new THREE.Group()
    scene.add(markersGroup)

    // Marqueurs pour chaque étape — pins rouges
    stops.forEach((stop) => {
      const pos = latLngToVector3(stop.lat, stop.lng, globeRadius + 0.015)

      // Pin
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xe74c3c })
      )
      pin.position.copy(pos)
      pin.userData = { name: stop.name, country: stop.country }
      markersGroup.add(pin)

      // Glow autour du pin
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0xff6b6b,
          transparent: true,
          opacity: 0.35,
        })
      )
      glow.position.copy(pos)
      markersGroup.add(glow)

      // Anneau blanc
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.052, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        })
      )
      ring.position.copy(pos)
      ring.lookAt(new THREE.Vector3(0, 0, 0))
      markersGroup.add(ring)
    })

    // Arcs dorés entre les étapes
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, globeRadius + 0.015)
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, globeRadius + 0.015)
      const arcPoints = createArc(start, end, globeRadius)
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arcPoints),
        new THREE.LineBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.8,
        })
      )
      markersGroup.add(arc)
    }

    // Pulse sur la position actuelle
    let pulseGlow = null
    if (currentPosition) {
      const pos = latLngToVector3(currentPosition.lat, currentPosition.lng, globeRadius + 0.02)

      markersGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
      ).translateX(pos.x).translateY(pos.y).translateZ(pos.z) ? (() => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
        )
        m.position.copy(pos)
        return m
      })() : null)

      // Recréer proprement le pulse
      const pulseCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
      )
      pulseCore.position.copy(pos)
      markersGroup.add(pulseCore)

      pulseGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0x2ecc71,
          transparent: true,
          opacity: 0.35,
        })
      )
      pulseGlow.position.copy(pos)
      markersGroup.add(pulseGlow)
    }

    // Contrôles de rotation
    let isDragging = false
    let prevPos = { x: 0, y: 0 }
    let autoRotate = true
    let resumeTimeout = null

    const onDown = (e) => {
      isDragging = true
      autoRotate = false
      if (resumeTimeout) clearTimeout(resumeTimeout)
      prevPos = {
        x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
        y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
      }
    }

    const syncRotation = () => {
      markersGroup.rotation.copy(globe.rotation)
    }

    const onMove = (e) => {
      if (!isDragging) return
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      globe.rotation.y += (x - prevPos.x) * 0.005
      globe.rotation.x += (y - prevPos.y) * 0.005
      syncRotation()
      prevPos = { x, y }
    }

    const onUp = () => {
      isDragging = false
      resumeTimeout = setTimeout(() => { autoRotate = true }, 3000)
    }

    renderer.domElement.addEventListener('mousedown', onDown)
    renderer.domElement.addEventListener('mousemove', onMove)
    renderer.domElement.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('touchstart', onDown)
    renderer.domElement.addEventListener('touchmove', onMove)
    renderer.domElement.addEventListener('touchend', onUp)

    // Raycaster
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

    // Animation
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01

      if (autoRotate) {
        globe.rotation.y += 0.0012
        syncRotation()
      }

      if (pulseGlow) {
        const s = 1 + Math.sin(time * 3) * 0.4
        pulseGlow.scale.set(s, s, s)
        pulseGlow.material.opacity = 0.2 + Math.sin(time * 3) * 0.15
      }

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('mousedown', onDown)
      renderer.domElement.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('mouseup', onUp)
      renderer.domElement.removeEventListener('touchstart', onDown)
      renderer.domElement.removeEventListener('touchmove', onMove)
      renderer.domElement.removeEventListener('touchend', onUp)
      renderer.domElement.removeEventListener('click', onClick)
      if (resumeTimeout) clearTimeout(resumeTimeout)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [stops.length, currentPosition?.lat, currentPosition?.lng])

  return (
    <div className="globe-section">
      <h2 className="section-title">Mon parcours</h2>
      <p className="section-subtitle">Faites glisser pour explorer le globe</p>
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
