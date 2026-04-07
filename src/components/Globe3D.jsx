// Globe 3D interactif — photos aux arrêts, avion animé entre étapes
import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import PhotoGallery from './PhotoGallery'
import StageWeather from './StageWeather'

const EARTH_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'

// Convertir lat/lng en coordonnées 3D
const latLngToVector3 = (lat, lng, radius) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Arc courbé entre deux points (hauteur réduite pour rester proche du globe)
const createArcPoints = (start, end, radius, segments = 100) => {
  const points = []
  const arcHeight = start.distanceTo(end) * 0.1
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const point = new THREE.Vector3().lerpVectors(start, end, t)
    point.normalize().multiplyScalar(radius + Math.sin(Math.PI * t) * arcHeight)
    points.push(point)
  }
  return points
}

// Dessiner une miniature photo arrondie sur un canvas
const createPhotoSprite = (imageUrl, size = 128) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Fond semi-transparent + bordure
      const r = size / 2
      const borderW = 4

      // Ombre portée
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 3

      // Bordure blanche
      ctx.beginPath()
      ctx.roundRect(borderW, borderW, size - borderW * 2, size - borderW * 2, 16)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // Clip arrondi pour l'image
      ctx.shadowColor = 'transparent'
      ctx.beginPath()
      ctx.roundRect(borderW + 3, borderW + 3, size - borderW * 2 - 6, size - borderW * 2 - 6, 12)
      ctx.clip()

      // Dessiner l'image (cover)
      const aspect = img.width / img.height
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (aspect > 1) {
        sx = (img.width - img.height) / 2
        sw = img.height
      } else {
        sy = (img.height - img.width) / 2
        sh = img.width
      }
      ctx.drawImage(img, sx, sy, sw, sh, borderW + 3, borderW + 3, size - borderW * 2 - 6, size - borderW * 2 - 6)

      const texture = new THREE.CanvasTexture(canvas)
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true })
      )
      resolve(sprite)
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}

// Emojis pour chaque mode de transport
const TRANSPORT_EMOJI = {
  plane: '\u2708\uFE0F',
  boat: '\u26F5',
  car: '\uD83D\uDE97',
  bus: '\uD83D\uDE8C',
  train: '\uD83D\uDE84',
  bike: '\uD83D\uDEB2',
  walk: '\uD83D\uDEB6',
  motorcycle: '\uD83C\uDFCD\uFE0F',
  hitchhike: '\uD83D\uDC4D',
  other: '\uD83D\uDEA9',
}

// Créer un sprite emoji pour le transport animé
const createTransportSprite = (emoji) => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.font = '42px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, size / 2, size / 2)
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true })
  )
  sprite.scale.set(0.07, 0.07, 1)
  return sprite
}

// Calculer la distance en km entre 2 points lat/lng
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const Globe3D = ({ travelerStatus, posts = [], trips = [] }) => {
  const mountRef = useRef(null)
  const [selectedStop, setSelectedStop] = useState(null)
  const [isReplaying, setIsReplaying] = useState(false)
  const [replayStage, setReplayStage] = useState(-1)
  const globeRef = useRef(null)
  const cameraRef = useRef(null)

  // Stops = uniquement les trips (arrêts du voyageur)
  const stops = trips
    .filter((t) => t.latitude && t.longitude)
    .map((t) => ({
      id: t.id,
      name: t.city || 'Inconnu',
      lat: t.latitude,
      lng: t.longitude,
      country: t.country || '',
      photoUrl: t.photoUrl || null,
      photos: t.photos || [],
      transport: t.transport || null,
      notes: t.notes || '',
      arrivalDate: t.arrivalDate || null,
      reactions: t.reactions || {},
    }))

  // Distance totale
  const totalKm = stops.reduce((sum, s, i) => {
    if (i === 0) return 0
    return sum + haversineKm(stops[i - 1].lat, stops[i - 1].lng, s.lat, s.lng)
  }, 0)

  const currentPosition = travelerStatus
    ? { lat: travelerStatus.latitude, lng: travelerStatus.longitude }
    : null

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()

    // Étoiles dorées en fond
    const starCount = 400
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
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xd4a044, size: 0.06, transparent: true, opacity: 0.3, sizeAttenuation: true,
    })))

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000)
    camera.position.z = 4.8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const globeRadius = 1.5
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = 'anonymous'

    // Globe
    const globeGeo = new THREE.SphereGeometry(globeRadius, 96, 96)
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x2a5a8a })
    const globe = new THREE.Mesh(globeGeo, globeMat)
    scene.add(globe)
    globeRef.current = globe
    cameraRef.current = camera

    textureLoader.load(EARTH_TEXTURE, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      globeMat.map = texture
      globeMat.color.set(0xffffff)
      globeMat.needsUpdate = true
    })

    // Halo atmosphérique
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius + 0.07, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x88bbee, transparent: true, opacity: 0.08, side: THREE.BackSide })
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius + 0.18, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x6699cc, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ))

    // Groupe marqueurs (tourne avec le globe)
    const markersGroup = new THREE.Group()
    scene.add(markersGroup)

    // --- ARCS en pointillés dorés + transport par segment ---
    const allArcPoints = []
    const allArcTransports = []
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, globeRadius + 0.01)
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, globeRadius + 0.01)
      const pts = createArcPoints(start, end, globeRadius, 100)
      allArcPoints.push(pts)
      // Le transport de l'étape d'arrivée (stops[i+1]) définit comment on s'y est rendu
      allArcTransports.push(stops[i + 1].transport || 'plane')

      // Arc pointillé doré
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineDashedMaterial({
        color: 0xd4a044, dashSize: 0.04, gapSize: 0.02, transparent: true, opacity: 0.6,
      })
      const line = new THREE.Line(geo, mat)
      line.computeLineDistances()
      markersGroup.add(line)
    }

    // --- MARQUEURS : point doré + photo arrondie ---
    stops.forEach((stop, index) => {
      const pos = latLngToVector3(stop.lat, stop.lng, globeRadius + 0.01)
      const isLast = index === stops.length - 1

      // Point doré au sol
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(isLast ? 0.025 : 0.018, 16, 16),
        new THREE.MeshBasicMaterial({ color: isLast ? 0xe8b85c : 0xd4a044 })
      )
      dot.position.copy(pos)
      dot.userData = { stopIndex: index }
      markersGroup.add(dot)

      // Glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(isLast ? 0.04 : 0.03, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xd4a044, transparent: true, opacity: 0.2 })
      )
      glow.position.copy(pos)
      markersGroup.add(glow)

      // Tige vers la photo
      const dir = pos.clone().normalize()
      const photoPos = pos.clone().add(dir.clone().multiplyScalar(0.12))
      const spikeGeo = new THREE.BufferGeometry().setFromPoints([pos, photoPos])
      markersGroup.add(new THREE.Line(spikeGeo, new THREE.LineBasicMaterial({
        color: 0xd4a044, transparent: true, opacity: 0.4,
      })))

      // Photo miniature arrondie (si photo disponible)
      if (stop.photoUrl) {
        createPhotoSprite(stop.photoUrl).then((sprite) => {
          if (!sprite) return
          sprite.position.copy(photoPos)
          sprite.scale.set(0.1, 0.1, 1)
          sprite.userData = { stopIndex: index }
          markersGroup.add(sprite)
        })
      } else {
        // Pas de photo : badge ville
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 48
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'rgba(26, 30, 36, 0.85)'
        ctx.beginPath()
        ctx.roundRect(0, 0, 128, 48, 10)
        ctx.fill()
        ctx.strokeStyle = 'rgba(212, 160, 68, 0.5)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(1, 1, 126, 46, 10)
        ctx.stroke()
        ctx.fillStyle = '#f2ece3'
        ctx.font = 'bold 18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(stop.name.substring(0, 12), 64, 24)
        const tex = new THREE.CanvasTexture(canvas)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }))
        sprite.position.copy(photoPos)
        sprite.scale.set(0.12, 0.045, 1)
        sprite.userData = { stopIndex: index }
        markersGroup.add(sprite)
      }
    })

    // --- EMOJI TRANSPORT ANIMÉ le long des arcs ---
    let transportSprite = null
    let transportProgress = 0
    let transportArcIndex = 0
    if (allArcPoints.length > 0) {
      const firstEmoji = TRANSPORT_EMOJI[allArcTransports[0]] || '\u2708\uFE0F'
      transportSprite = createTransportSprite(firstEmoji)
      transportSprite._currentTransport = allArcTransports[0]
      markersGroup.add(transportSprite)
    }

    // --- Position actuelle pulse ---
    let pulseGlow = null
    if (currentPosition) {
      const pos = latLngToVector3(currentPosition.lat, currentPosition.lng, globeRadius + 0.02)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x5cb87a })
      )
      core.position.copy(pos)
      markersGroup.add(core)

      pulseGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x5cb87a, transparent: true, opacity: 0.35 })
      )
      pulseGlow.position.copy(pos)
      markersGroup.add(pulseGlow)
    }

    // --- Contrôles rotation ---
    let isDragging = false
    let prevPos = { x: 0, y: 0 }
    let rotationVelocity = { x: 0, y: 0 }

    const syncRotation = () => {
      markersGroup.rotation.copy(globe.rotation)
    }

    const onDown = (e) => {
      isDragging = true
      rotationVelocity = { x: 0, y: 0 }
      prevPos = {
        x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
        y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
      }
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
    const onUp = () => { isDragging = false }

    // Zoom molette
    const minZoom = 2.5
    const maxZoom = 8
    const onWheel = (e) => {
      e.preventDefault()
      camera.position.z = Math.max(minZoom, Math.min(maxZoom, camera.position.z + e.deltaY * 0.003))
    }

    // Zoom pinch (mobile)
    let lastPinchDist = 0
    const onTouchStartZoom = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist = Math.sqrt(dx * dx + dy * dy)
      }
    }
    const onTouchMoveZoom = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const delta = lastPinchDist - dist
        camera.position.z = Math.max(minZoom, Math.min(maxZoom, camera.position.z + delta * 0.01))
        lastPinchDist = dist
      }
    }

    renderer.domElement.addEventListener('mousedown', onDown)
    renderer.domElement.addEventListener('mousemove', onMove)
    renderer.domElement.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    renderer.domElement.addEventListener('touchstart', onDown)
    renderer.domElement.addEventListener('touchstart', onTouchStartZoom)
    renderer.domElement.addEventListener('touchmove', onMove)
    renderer.domElement.addEventListener('touchmove', onTouchMoveZoom)
    renderer.domElement.addEventListener('touchend', onUp)

    // Raycaster — clic pour ouvrir la fiche détaillée
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let clickStart = { x: 0, y: 0, time: 0 }
    const onClickDown = (e) => {
      clickStart = {
        x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
        y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
        time: Date.now(),
      }
    }
    const onClick = (e) => {
      // Ignorer les drags (distance > 5px ou durée > 300ms)
      const cx = e.clientX ?? 0
      const cy = e.clientY ?? 0
      const dist = Math.sqrt((cx - clickStart.x) ** 2 + (cy - clickStart.y) ** 2)
      if (dist > 5 || Date.now() - clickStart.time > 300) return

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(markersGroup.children, true)
      for (const hit of intersects) {
        const idx = hit.object.userData?.stopIndex
        if (idx !== undefined && idx !== null) {
          setSelectedStop(idx)
          break
        }
      }
    }
    renderer.domElement.addEventListener('mousedown', onClickDown)
    renderer.domElement.addEventListener('click', onClick)

    // --- Boucle animation ---
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01

      // Inertie
      if (!isDragging) {
        rotationVelocity.x *= 0.95
        rotationVelocity.y *= 0.95
        if (Math.abs(rotationVelocity.x) > 0.0001 || Math.abs(rotationVelocity.y) > 0.0001) {
          globe.rotation.x += rotationVelocity.x
          globe.rotation.y += rotationVelocity.y
          syncRotation()
        }
      }

      // Emoji transport animé
      if (transportSprite && allArcPoints.length > 0) {
        transportProgress += 0.003
        if (transportProgress >= 1) {
          transportProgress = 0
          transportArcIndex = (transportArcIndex + 1) % allArcPoints.length
          // Changer l'emoji si le transport change
          const newTransport = allArcTransports[transportArcIndex]
          if (newTransport !== transportSprite._currentTransport) {
            markersGroup.remove(transportSprite)
            transportSprite = createTransportSprite(TRANSPORT_EMOJI[newTransport] || '\u2708\uFE0F')
            transportSprite._currentTransport = newTransport
            markersGroup.add(transportSprite)
          }
        }
        const arc = allArcPoints[transportArcIndex]
        const idx = Math.floor(transportProgress * (arc.length - 2))
        const nextIdx = Math.min(idx + 1, arc.length - 1)
        const lerpT = (transportProgress * (arc.length - 2)) - idx
        const pos = new THREE.Vector3().lerpVectors(arc[idx], arc[nextIdx], lerpT)
        transportSprite.position.copy(pos)
      }

      // Pulse position actuelle
      if (pulseGlow) {
        const s = 1 + Math.sin(time * 2.5) * 0.4
        pulseGlow.scale.set(s, s, s)
        pulseGlow.material.opacity = 0.15 + Math.sin(time * 2.5) * 0.2
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
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('touchstart', onDown)
      renderer.domElement.removeEventListener('touchstart', onTouchStartZoom)
      renderer.domElement.removeEventListener('touchmove', onMove)
      renderer.domElement.removeEventListener('touchmove', onTouchMoveZoom)
      renderer.domElement.removeEventListener('touchend', onUp)
      renderer.domElement.removeEventListener('mousedown', onClickDown)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [stops.length, trips.length, currentPosition?.lat, currentPosition?.lng])

  const TRANSPORT_ICONS = {
    plane: '\u2708\uFE0F', boat: '\u26F5', car: '\uD83D\uDE97', bus: '\uD83D\uDE8C',
    train: '\uD83D\uDE84', bike: '\uD83D\uDEB2', walk: '\uD83D\uDEB6',
    motorcycle: '\uD83C\uDFCD\uFE0F', hitchhike: '\uD83D\uDC4D', other: '\uD83D\uDEA9',
  }
  const TRANSPORT_LABELS = {
    plane: 'Avion', boat: 'Bateau', car: 'Voiture', bus: 'Bus',
    train: 'Train', bike: 'V\u00e9lo', walk: '\u00c0 pied',
    motorcycle: 'Moto', hitchhike: 'Auto-stop', other: 'Autre',
  }

  const activeStop = selectedStop !== null ? stops[selectedStop] : null
  const closeDetail = useCallback(() => setSelectedStop(null), [])

  // Récap animé — fly-over d'étape en étape
  const startReplay = useCallback(() => {
    if (stops.length < 2 || isReplaying) return
    setIsReplaying(true)
    setSelectedStop(null)
    setReplayStage(0)

    let stageIdx = 0
    const globe = globeRef.current
    const camera = cameraRef.current
    if (!globe || !camera) { setIsReplaying(false); return }

    // Zoom initial
    camera.position.z = 3.5

    const goToStage = (idx) => {
      const stop = stops[idx]
      // Calculer la rotation pour centrer sur cette étape
      const targetRotY = -(stop.lng + 180) * (Math.PI / 180) + Math.PI
      const targetRotX = stop.lat * (Math.PI / 180)

      // Animation smooth vers la position
      const startRotX = globe.rotation.x
      const startRotY = globe.rotation.y
      const duration = 1500
      const startTime = Date.now()

      const animateToStage = () => {
        const elapsed = Date.now() - startTime
        const t = Math.min(elapsed / duration, 1)
        // Ease in-out cubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

        globe.rotation.x = startRotX + (targetRotX - startRotX) * ease
        globe.rotation.y = startRotY + (targetRotY - startRotY) * ease

        // Sync markers
        const markersGroup = globe.parent?.children.find(c => c.type === 'Group')
        if (markersGroup) markersGroup.rotation.copy(globe.rotation)

        if (t < 1) {
          requestAnimationFrame(animateToStage)
        } else {
          setReplayStage(idx)
          // Attendre puis passer à l'étape suivante
          if (idx < stops.length - 1) {
            setTimeout(() => goToStage(idx + 1), 2000)
          } else {
            // Fin du replay
            setTimeout(() => {
              setIsReplaying(false)
              setReplayStage(-1)
            }, 2500)
          }
        }
      }
      animateToStage()
    }

    goToStage(0)
  }, [stops, isReplaying])

  return (
    <div className="globe-section">
      <div className="globe-header">
        <h2 className="globe-title">Mon parcours</h2>
        <div className="globe-stats-bar">
          {stops.length > 0 && (
            <span className="globe-stat">{stops.length} {stops.length > 1 ? 'etapes' : 'etape'}</span>
          )}
          {totalKm > 0 && (
            <span className="globe-stat">{Math.round(totalKm).toLocaleString('fr-FR')} km</span>
          )}
          {stops.length > 1 && (
            <span className="globe-stat">{new Set(stops.map(s => s.country).filter(Boolean)).size} pays</span>
          )}
          {stops.length >= 2 && (
            <button className="replay-btn" onClick={startReplay} disabled={isReplaying}>
              {isReplaying ? 'En cours...' : '\u25B6 Revoir le voyage'}
            </button>
          )}
        </div>
      </div>
      <div className="globe-container" ref={mountRef}>
        {/* Overlay récap animé */}
        {isReplaying && replayStage >= 0 && stops[replayStage] && (
          <div className="replay-overlay">
            <div className="replay-card">
              <span className="replay-stage-num">{replayStage + 1}/{stops.length}</span>
              <h3 className="replay-city">{stops[replayStage].name}</h3>
              {stops[replayStage].country && <p className="replay-country">{stops[replayStage].country}</p>}
              {stops[replayStage].transport && (
                <span className="replay-transport">
                  {TRANSPORT_ICONS[stops[replayStage].transport]} {TRANSPORT_LABELS[stops[replayStage].transport]}
                </span>
              )}
              {stops[replayStage].arrivalDate && (
                <span className="replay-date">
                  {new Date(stops[replayStage].arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Fiche détaillée d'une étape */}
        {!isReplaying && activeStop && (
          <div className="stage-detail-overlay" onClick={closeDetail}>
            <div className="stage-detail-card" onClick={(e) => e.stopPropagation()}>
              <button className="stage-detail-close" onClick={closeDetail}>&times;</button>

              {/* Photos */}
              {(activeStop.photos?.length > 0 || activeStop.photoUrl) && (
                <div className="stage-detail-photos">
                  <PhotoGallery
                    photos={activeStop.photos?.length > 0 ? activeStop.photos : [activeStop.photoUrl]}
                    city={activeStop.name}
                  />
                </div>
              )}

              {/* Infos */}
              <div className="stage-detail-info">
                <h3 className="stage-detail-city">{activeStop.name}</h3>
                {activeStop.country && (
                  <p className="stage-detail-country">{activeStop.country}</p>
                )}

                <div className="stage-detail-meta">
                  {activeStop.arrivalDate && (
                    <span className="stage-detail-tag">
                      &#128197; {new Date(activeStop.arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                  {activeStop.transport && (
                    <span className="stage-detail-tag">
                      {TRANSPORT_ICONS[activeStop.transport]} {TRANSPORT_LABELS[activeStop.transport]}
                    </span>
                  )}
                  <span className="stage-detail-tag stage-detail-step">
                    &Eacute;tape {selectedStop + 1}/{stops.length}
                  </span>
                </div>

                {activeStop.notes && (
                  <p className="stage-detail-notes">{activeStop.notes}</p>
                )}

                {/* Météo */}
                <StageWeather latitude={activeStop.lat} longitude={activeStop.lng} />

                {/* Réactions */}
                {Object.keys(activeStop.reactions).length > 0 && (
                  <div className="stage-detail-reactions">
                    {Object.entries(activeStop.reactions).map(([emoji, users]) => (
                      users.length > 0 && (
                        <span key={emoji} className="reaction-pill">
                          <span>{emoji}</span>
                          <span className="reaction-count">{users.length}</span>
                        </span>
                      )
                    ))}
                  </div>
                )}
              </div>
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
                {i < stops.length - 1 && (
                  <div className="legend-connector">
                    <span className="legend-plane-icon">
                      {stops[i + 1].transport ? (TRANSPORT_ICONS[stops[i + 1].transport] || '\u2708\uFE0F') : '\u2708\uFE0F'}
                    </span>
                  </div>
                )}
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
