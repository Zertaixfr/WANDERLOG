// Globe 3D interactif — style carnet de voyage vintage
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Texture Terre haute qualité
const EARTH_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'

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

// Arc courbé entre deux points (plus lisse)
const createArc = (start, end, radius) => {
  const points = []
  const arcHeight = start.distanceTo(end) * 0.35
  for (let i = 0; i <= 80; i++) {
    const t = i / 80
    const point = new THREE.Vector3().lerpVectors(start, end, t)
    point.normalize().multiplyScalar(radius + Math.sin(Math.PI * t) * arcHeight)
    points.push(point)
  }
  return points
}

// Créer un arc en pointillés animé
const createDashedArc = (start, end, radius) => {
  const arcPoints = createArc(start, end, radius)
  const geometry = new THREE.BufferGeometry().setFromPoints(arcPoints)
  const material = new THREE.LineDashedMaterial({
    color: 0xd4a044,
    dashSize: 0.04,
    gapSize: 0.02,
    transparent: true,
    opacity: 0.9,
  })
  const line = new THREE.Line(geometry, material)
  line.computeLineDistances()
  return line
}

// Marqueur pin style voyage
const createPin = (position, color, glowColor, size = 1) => {
  const group = new THREE.Group()

  // Tige du pin
  const spikeDir = position.clone().normalize()
  const spikeStart = position.clone()
  const spikeEnd = position.clone().add(spikeDir.clone().multiplyScalar(0.06 * size))
  const spikeGeo = new THREE.BufferGeometry().setFromPoints([spikeStart, spikeEnd])
  const spike = new THREE.Line(spikeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }))
  group.add(spike)

  // Tête du pin (diamant)
  const headPos = spikeEnd
  const head = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.025 * size, 0),
    new THREE.MeshBasicMaterial({ color })
  )
  head.position.copy(headPos)
  group.add(head)

  // Glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.045 * size, 12, 12),
    new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.25 })
  )
  glow.position.copy(headPos)
  group.add(glow)

  // Cercle au sol
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.02 * size, 0.032 * size, 20),
    new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  )
  ring.position.copy(position)
  ring.lookAt(new THREE.Vector3(0, 0, 0))
  group.add(ring)

  return { group, head, glow }
}

const Globe3D = ({ travelerStatus, posts = [], trips = [] }) => {
  const mountRef = useRef(null)
  const [selectedStop, setSelectedStop] = useState(null)

  // Étapes du voyage — combine trips + posts géolocalisés
  const tripStops = trips
    .filter((t) => t.latitude && t.longitude)
    .map((t) => ({
      name: t.city || 'Inconnu',
      lat: t.latitude,
      lng: t.longitude,
      country: t.country || '',
    }))

  const postStops = posts
    .filter((p) => p.coordinates)
    .map((p) => ({
      name: p.location || p.country || 'Inconnu',
      lat: p.coordinates.latitude,
      lng: p.coordinates.longitude,
      country: p.country || '',
    }))

  const seen = new Set()
  const stops = [...tripStops, ...postStops].filter((s) => {
    const key = `${s.lat.toFixed(2)},${s.lng.toFixed(2)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

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

    // Étoiles en fond — petits points blancs
    const starCount = 600
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 15 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xd4a044,
      size: 0.08,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    }))
    scene.add(stars)

    // Caméra — reculée pour voir le globe en entier
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000)
    camera.position.z = 4.8

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    container.appendChild(renderer.domElement)

    const globeRadius = 1.5
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = 'anonymous'

    // Éclairage lumineux — bien voir tous les continents
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.0)
    sunLight.position.set(5, 3, 5)
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0xfff8ee, 0.6)
    fillLight.position.set(-4, 2, -3)
    scene.add(fillLight)

    const backLight = new THREE.DirectionalLight(0xd4a044, 0.3)
    backLight.position.set(0, -3, -5)
    scene.add(backLight)

    // Globe terrestre — texture réaliste, bien éclairé
    const globeGeometry = new THREE.SphereGeometry(globeRadius, 96, 96)
    const globeMaterial = new THREE.MeshBasicMaterial({ color: 0x2a5a8a })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    // Charger la texture satellite
    textureLoader.load(EARTH_TEXTURE, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      globeMaterial.map = texture
      globeMaterial.color.set(0xffffff)
      globeMaterial.needsUpdate = true
    })

    // Halo atmosphérique bleu clair
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius + 0.07, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x88bbee, transparent: true, opacity: 0.08, side: THREE.BackSide })
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius + 0.18, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x6699cc, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ))

    const gridGroup = new THREE.Group()

    // Groupe pour les marqueurs
    const markersGroup = new THREE.Group()
    scene.add(markersGroup)

    // Objets animables
    const animatedPins = []

    // Marqueurs pour chaque étape
    stops.forEach((stop, index) => {
      const pos = latLngToVector3(stop.lat, stop.lng, globeRadius + 0.012)

      // Couleur : gold pour les étapes, dernier stop en orange vif
      const isLast = index === stops.length - 1
      const pinColor = isLast ? 0xe8b85c : 0xd4a044
      const glowColor = isLast ? 0xffd700 : 0xd4a044

      const { group, head, glow } = createPin(pos, pinColor, glowColor, isLast ? 1.3 : 1)
      head.userData = { name: stop.name, country: stop.country }
      markersGroup.add(group)
      animatedPins.push({ head, glow, isLast })

      // Numéro de l'étape (petit texte)
      // On utilise un sprite avec un canvas
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, 64, 64)
      ctx.fillStyle = '#ede6db'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(index + 1), 32, 32)
      const numberTex = new THREE.CanvasTexture(canvas)
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: numberTex, transparent: true, opacity: 0.7 })
      )
      const spritePos = pos.clone().normalize().multiplyScalar(globeRadius + 0.12)
      sprite.position.copy(spritePos)
      sprite.scale.set(0.08, 0.08, 1)
      markersGroup.add(sprite)
    })

    // Arcs en pointillés dorés entre les étapes
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, globeRadius + 0.012)
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, globeRadius + 0.012)
      const arc = createDashedArc(start, end, globeRadius)
      markersGroup.add(arc)
    }

    // Position actuelle — pulse vert voyageur
    let pulseGlow = null
    let pulseRing = null
    if (currentPosition) {
      const pos = latLngToVector3(currentPosition.lat, currentPosition.lng, globeRadius + 0.02)

      // Point vert vif
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x5cb87a })
      )
      core.position.copy(pos)
      markersGroup.add(core)

      // Pulse
      pulseGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x5cb87a, transparent: true, opacity: 0.35 })
      )
      pulseGlow.position.copy(pos)
      markersGroup.add(pulseGlow)

      // Anneau qui s'étend
      pulseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.055, 32),
        new THREE.MeshBasicMaterial({ color: 0x5cb87a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      )
      pulseRing.position.copy(pos)
      pulseRing.lookAt(new THREE.Vector3(0, 0, 0))
      markersGroup.add(pulseRing)
    }

    // Particules de voyage flottantes autour du globe
    const particleCount = 80
    const particlePositions = new Float32Array(particleCount * 3)
    const particleSpeeds = []
    for (let i = 0; i < particleCount; i++) {
      const r = globeRadius + 0.15 + Math.random() * 0.3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      particlePositions[i * 3 + 2] = r * Math.cos(phi)
      particleSpeeds.push(0.0003 + Math.random() * 0.0008)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      color: 0xd4a044,
      size: 0.02,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    }))
    scene.add(particles)

    // Contrôles de rotation
    let isDragging = false
    let prevPos = { x: 0, y: 0 }
    let autoRotate = true
    let resumeTimeout = null
    let rotationVelocity = { x: 0, y: 0 }

    const onDown = (e) => {
      isDragging = true
      autoRotate = false
      rotationVelocity = { x: 0, y: 0 }
      if (resumeTimeout) clearTimeout(resumeTimeout)
      prevPos = {
        x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
        y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
      }
    }

    const syncRotation = () => {
      markersGroup.rotation.copy(globe.rotation)
      gridGroup.rotation.copy(globe.rotation)
    }

    const onMove = (e) => {
      if (!isDragging) return
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      const dx = (x - prevPos.x) * 0.005
      const dy = (y - prevPos.y) * 0.005
      globe.rotation.y += dx
      globe.rotation.x += dy
      rotationVelocity = { x: dy, y: dx }
      syncRotation()
      prevPos = { x, y }
    }

    const onUp = () => {
      isDragging = false
      resumeTimeout = setTimeout(() => { autoRotate = true }, 4000)
    }

    renderer.domElement.addEventListener('mousedown', onDown)
    renderer.domElement.addEventListener('mousemove', onMove)
    renderer.domElement.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('touchstart', onDown)
    renderer.domElement.addEventListener('touchmove', onMove)
    renderer.domElement.addEventListener('touchend', onUp)

    // Raycaster — clic sur marqueurs
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(markersGroup.children, true)
      for (const hit of intersects) {
        if (hit.object.userData?.name) {
          setSelectedStop(hit.object.userData)
          setTimeout(() => setSelectedStop(null), 4000)
          break
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    // Boucle d'animation
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01

      // Rotation auto douce
      if (autoRotate) {
        globe.rotation.y += 0.0008
        syncRotation()
      } else if (!isDragging) {
        // Inertie après drag
        rotationVelocity.x *= 0.95
        rotationVelocity.y *= 0.95
        if (Math.abs(rotationVelocity.x) > 0.0001 || Math.abs(rotationVelocity.y) > 0.0001) {
          globe.rotation.x += rotationVelocity.x
          globe.rotation.y += rotationVelocity.y
          syncRotation()
        }
      }

      // Pins qui flottent doucement
      animatedPins.forEach(({ head, glow, isLast }, i) => {
        const bounce = Math.sin(time * 2 + i * 0.7) * 0.003
        const dir = head.position.clone().normalize()
        head.position.add(dir.multiplyScalar(bounce))
        glow.position.copy(head.position)
        if (isLast) {
          glow.material.opacity = 0.2 + Math.sin(time * 3) * 0.15
        }
      })

      // Pulse position actuelle
      if (pulseGlow) {
        const s = 1 + Math.sin(time * 2.5) * 0.5
        pulseGlow.scale.set(s, s, s)
        pulseGlow.material.opacity = 0.15 + Math.sin(time * 2.5) * 0.2
      }
      if (pulseRing) {
        const rs = 1 + ((time * 0.5) % 1) * 1.5
        pulseRing.scale.set(rs, rs, rs)
        pulseRing.material.opacity = Math.max(0, 0.5 - ((time * 0.5) % 1) * 0.5)
      }

      // Particules tournent doucement
      particles.rotation.y += 0.0003
      particles.rotation.x += 0.0001

      // Étoiles scintillent
      stars.rotation.y += 0.00005

      renderer.render(scene, camera)
    }
    animate()

    // Resize responsive
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
  }, [stops.length, trips.length, currentPosition?.lat, currentPosition?.lng])

  return (
    <div className="globe-section">
      <div className="globe-header">
        <h2 className="globe-title">Mon parcours</h2>
        {stops.length > 0 && (
          <span className="globe-count">{stops.length} {stops.length > 1 ? 'etapes' : 'etape'}</span>
        )}
      </div>
      <div className="globe-container" ref={mountRef}>
        {selectedStop && (
          <div className="globe-tooltip">
            <span className="tooltip-pin">&#128205;</span>
            <div className="tooltip-text">
              <span className="tooltip-name">{selectedStop.name}</span>
              {selectedStop.country && (
                <span className="tooltip-country">{selectedStop.country}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {stops.length > 0 && (
        <div className="globe-legend">
          <div className="legend-route">
            {stops.map((stop, i) => (
              <div key={i} className="legend-stop">
                <div className="legend-number">{i + 1}</div>
                <div className="legend-info">
                  <span className="legend-city">{stop.name}</span>
                  {stop.country && <span className="legend-country">{stop.country}</span>}
                </div>
                {i < stops.length - 1 && <div className="legend-connector" />}
              </div>
            ))}
          </div>
          {currentPosition && (
            <div className="legend-current">
              <span className="legend-live-dot" />
              <span className="legend-live-text">Position actuelle</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Globe3D
