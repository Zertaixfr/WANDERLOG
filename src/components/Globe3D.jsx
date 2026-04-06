// Globe 3D interactif — photos aux arrêts, avion animé entre étapes
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

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

// Arc courbé entre deux points
const createArcPoints = (start, end, radius, segments = 100) => {
  const points = []
  const arcHeight = start.distanceTo(end) * 0.35
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

// Créer un petit avion en géométrie (triangle + ailes)
const createPlane = () => {
  const group = new THREE.Group()

  // Corps (cône allongé)
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.012, 0.05, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  body.rotation.x = Math.PI / 2
  group.add(body)

  // Ailes
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.lineTo(-0.035, -0.012)
  wingShape.lineTo(0, 0.008)
  wingShape.lineTo(0.035, -0.012)
  wingShape.closePath()
  const wings = new THREE.Mesh(
    new THREE.ShapeGeometry(wingShape),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  )
  wings.rotation.x = Math.PI / 2
  wings.position.z = 0.005
  group.add(wings)

  // Traînée lumineuse
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(0.006, 0.06, 4),
    new THREE.MeshBasicMaterial({ color: 0xd4a044, transparent: true, opacity: 0.4 })
  )
  trail.rotation.x = -Math.PI / 2
  trail.position.z = 0.04
  group.add(trail)

  return group
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

  // Stops = uniquement les trips (arrêts du voyageur)
  const stops = trips
    .filter((t) => t.latitude && t.longitude)
    .map((t) => ({
      name: t.city || 'Inconnu',
      lat: t.latitude,
      lng: t.longitude,
      country: t.country || '',
      photoUrl: t.photoUrl || null,
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

    // --- ARCS en pointillés dorés ---
    const allArcPoints = [] // pour l'avion
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, globeRadius + 0.01)
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, globeRadius + 0.01)
      const pts = createArcPoints(start, end, globeRadius, 100)
      allArcPoints.push(pts)

      // Arc pointillé doré
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineDashedMaterial({
        color: 0xd4a044, dashSize: 0.04, gapSize: 0.02, transparent: true, opacity: 0.7,
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
      dot.userData = { name: stop.name, country: stop.country }
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
          sprite.userData = { name: stop.name, country: stop.country }
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
        sprite.userData = { name: stop.name, country: stop.country }
        markersGroup.add(sprite)
      }
    })

    // --- AVION ANIMÉ le long des arcs ---
    let plane = null
    let planeProgress = 0
    let planeArcIndex = 0
    if (allArcPoints.length > 0) {
      plane = createPlane()
      markersGroup.add(plane)
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

      // Avion animé
      if (plane && allArcPoints.length > 0) {
        planeProgress += 0.003
        if (planeProgress >= 1) {
          planeProgress = 0
          planeArcIndex = (planeArcIndex + 1) % allArcPoints.length
        }
        const arc = allArcPoints[planeArcIndex]
        const idx = Math.floor(planeProgress * (arc.length - 2))
        const nextIdx = Math.min(idx + 1, arc.length - 1)
        const lerpT = (planeProgress * (arc.length - 2)) - idx
        const pos = new THREE.Vector3().lerpVectors(arc[idx], arc[nextIdx], lerpT)
        plane.position.copy(pos)

        // Orienter l'avion dans la direction du vol
        if (nextIdx < arc.length - 1) {
          const forward = arc[nextIdx + 1] || arc[nextIdx]
          const dir = new THREE.Vector3().subVectors(forward, pos).normalize()
          const up = pos.clone().normalize()
          const mat4 = new THREE.Matrix4()
          const right = new THREE.Vector3().crossVectors(dir, up).normalize()
          const correctedUp = new THREE.Vector3().crossVectors(right, dir).normalize()
          mat4.makeBasis(right, correctedUp, dir.negate())
          plane.setRotationFromMatrix(mat4)
        }
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
      renderer.domElement.removeEventListener('touchstart', onDown)
      renderer.domElement.removeEventListener('touchmove', onMove)
      renderer.domElement.removeEventListener('touchend', onUp)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [stops.length, trips.length, currentPosition?.lat, currentPosition?.lng])

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
        </div>
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
                {i < stops.length - 1 && (
                  <div className="legend-connector">
                    <span className="legend-plane-icon">&#9992;</span>
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
