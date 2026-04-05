// Globe 3D interactif — style carte du monde colorée
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// TopoJSON des pays
const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

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

// Décoder les arcs TopoJSON en coordonnées [lng, lat]
const decodeArc = (topology, arcIndex) => {
  const isReversed = arcIndex < 0
  const index = isReversed ? ~arcIndex : arcIndex
  const arc = topology.arcs[index]
  const coords = []
  let x = 0, y = 0

  for (const [dx, dy] of arc) {
    x += dx
    y += dy
    const lng = x * topology.transform.scale[0] + topology.transform.translate[0]
    const lat = y * topology.transform.scale[1] + topology.transform.translate[1]
    coords.push([lng, lat])
  }

  if (isReversed) coords.reverse()
  return coords
}

// Extraire les polygones (contours remplis) et les lignes de frontières
const extractCountryPolygons = (topology) => {
  const polygons = []
  const countries = topology.objects.countries
  if (!countries) return polygons

  const geometries = countries.geometries || []
  for (const geo of geometries) {
    const allRings = []
    if (geo.type === 'Polygon') {
      allRings.push(geo.arcs)
    } else if (geo.type === 'MultiPolygon') {
      for (const polygon of geo.arcs) {
        allRings.push(...polygon)
      }
    }

    for (const ring of allRings) {
      const ringArcs = Array.isArray(ring) ? ring : [ring]
      const coords = []
      for (const arcIdx of ringArcs) {
        const decoded = decodeArc(topology, arcIdx)
        if (coords.length > 0 && decoded.length > 0) {
          coords.push(...decoded.slice(1))
        } else {
          coords.push(...decoded)
        }
      }
      if (coords.length > 2) {
        polygons.push(coords)
      }
    }
  }
  return polygons
}

// Trianguler un polygone sur la sphère (méthode fan simple)
const triangulatePolygon = (coords, radius) => {
  if (coords.length < 3) return []

  const vertices = []
  const center = latLngToVector3(
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    radius
  )

  for (let i = 0; i < coords.length - 1; i++) {
    const v1 = latLngToVector3(coords[i][1], coords[i][0], radius)
    const v2 = latLngToVector3(coords[i + 1][1], coords[i + 1][0], radius)
    vertices.push(
      center.x, center.y, center.z,
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z
    )
  }
  return vertices
}

// Palette de couleurs pour les continents — tons naturels et chauds
const getCountryColor = (index) => {
  const colors = [
    0x4a7c59, // Vert forêt
    0x5b8c5a, // Vert sauge
    0x6b9e6b, // Vert prairie
    0x7bae7b, // Vert clair
    0x8cb88c, // Vert doux
    0x5a8f6e, // Vert émeraude doux
    0x6d9a7a, // Vert mousse
    0x4e8860, // Vert profond
    0x79a87e, // Vert pastel
    0x5c946e, // Vert naturel
    0x689875, // Vert olive clair
    0x74a680, // Vert tendre
  ]
  return colors[index % colors.length]
}

const Globe3D = ({ travelerStatus, posts = [] }) => {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
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

    const globeRadius = 1.5

    // Océan — sphère bleu profond
    const oceanGeometry = new THREE.SphereGeometry(globeRadius, 64, 64)
    const oceanMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a3a5c,
    })
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial)
    scene.add(ocean)

    // Légère grille sur l'océan (méridiens/parallèles)
    const gridGeometry = new THREE.SphereGeometry(globeRadius + 0.001, 24, 12)
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a5a8c,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })
    const grid = new THREE.Mesh(gridGeometry, gridMaterial)
    scene.add(grid)

    // Halo atmosphérique bleu ciel
    const haloGeometry = new THREE.SphereGeometry(globeRadius + 0.15, 48, 48)
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    })
    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    scene.add(halo)

    // Deuxième halo plus large
    const halo2Geometry = new THREE.SphereGeometry(globeRadius + 0.25, 48, 48)
    const halo2Material = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    })
    const halo2 = new THREE.Mesh(halo2Geometry, halo2Material)
    scene.add(halo2)

    // Groupe pour les continents et frontières
    const landGroup = new THREE.Group()
    scene.add(landGroup)

    // Groupe pour les marqueurs et arcs
    const markersGroup = new THREE.Group()
    scene.add(markersGroup)

    // Charger et dessiner les pays en couleur
    fetch(TOPOJSON_URL)
      .then((res) => res.json())
      .then((topology) => {
        const polygons = extractCountryPolygons(topology)

        // Remplir les pays en couleur
        polygons.forEach((coords, i) => {
          const vertices = triangulatePolygon(coords, globeRadius + 0.004)
          if (vertices.length === 0) return

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
          )
          geometry.computeVertexNormals()

          const material = new THREE.MeshBasicMaterial({
            color: getCountryColor(i),
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
          })

          const mesh = new THREE.Mesh(geometry, material)
          landGroup.add(mesh)
        })

        // Dessiner les frontières en lignes fines
        polygons.forEach((coords) => {
          const points = coords.map(([lng, lat]) =>
            latLngToVector3(lat, lng, globeRadius + 0.006)
          )
          if (points.length < 2) return

          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          const material = new THREE.LineBasicMaterial({
            color: 0x2d5a3d,
            transparent: true,
            opacity: 0.5,
          })
          const line = new THREE.Line(geometry, material)
          landGroup.add(line)
        })
      })
      .catch((err) => console.error('Erreur chargement des frontières:', err))

    // Marqueurs pour chaque étape — style pin rouge/orange
    stops.forEach((stop) => {
      const pos = latLngToVector3(stop.lat, stop.lng, globeRadius + 0.02)

      // Pin principal
      const markerGeometry = new THREE.SphereGeometry(0.035, 16, 16)
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xe74c3c })
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.copy(pos)
      marker.userData = { name: stop.name, country: stop.country }
      markersGroup.add(marker)

      // Halo lumineux
      const glowGeometry = new THREE.SphereGeometry(0.055, 16, 16)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.3,
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.copy(pos)
      markersGroup.add(glow)

      // Anneau autour du marqueur
      const ringGeometry = new THREE.RingGeometry(0.045, 0.055, 24)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.position.copy(pos)
      ring.lookAt(new THREE.Vector3(0, 0, 0))
      markersGroup.add(ring)
    })

    // Arcs entre les étapes — ligne dorée lumineuse
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, globeRadius + 0.02)
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, globeRadius + 0.02)
      const arcPoints = createArc(start, end, globeRadius)
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints)
      const arcMaterial = new THREE.LineBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.7,
      })
      const arc = new THREE.Line(arcGeometry, arcMaterial)
      markersGroup.add(arc)
    }

    // Pulse animé sur la position actuelle — vert vif
    let pulseGlow = null
    if (currentPosition) {
      const pos = latLngToVector3(currentPosition.lat, currentPosition.lng, globeRadius + 0.025)

      const pulseMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
      )
      pulseMarker.position.copy(pos)
      markersGroup.add(pulseMarker)

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

      // Anneau blanc autour de la position actuelle
      const posRing = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.075, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        })
      )
      posRing.position.copy(pos)
      posRing.lookAt(new THREE.Vector3(0, 0, 0))
      markersGroup.add(posRing)
    }

    // Contrôles de rotation
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let autoRotate = true
    let resumeTimeout = null

    const onMouseDown = (e) => {
      isDragging = true
      autoRotate = false
      if (resumeTimeout) clearTimeout(resumeTimeout)
      previousMousePosition = {
        x: e.clientX || e.touches?.[0]?.clientX || 0,
        y: e.clientY || e.touches?.[0]?.clientY || 0,
      }
    }

    const syncRotation = () => {
      grid.rotation.copy(ocean.rotation)
      landGroup.rotation.copy(ocean.rotation)
      markersGroup.rotation.copy(ocean.rotation)
    }

    const onMouseMove = (e) => {
      if (!isDragging) return
      const x = e.clientX || e.touches?.[0]?.clientX || 0
      const y = e.clientY || e.touches?.[0]?.clientY || 0
      const deltaX = x - previousMousePosition.x
      const deltaY = y - previousMousePosition.y

      ocean.rotation.y += deltaX * 0.005
      ocean.rotation.x += deltaY * 0.005
      syncRotation()

      previousMousePosition = { x, y }
    }

    const onMouseUp = () => {
      isDragging = false
      resumeTimeout = setTimeout(() => { autoRotate = true }, 3000)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('touchstart', onMouseDown)
    renderer.domElement.addEventListener('touchmove', onMouseMove)
    renderer.domElement.addEventListener('touchend', onMouseUp)

    // Raycaster pour les clics sur marqueurs
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

      if (autoRotate) {
        ocean.rotation.y += 0.0015
        syncRotation()
      }

      // Pulse animé
      if (pulseGlow) {
        const scale = 1 + Math.sin(time * 3) * 0.4
        pulseGlow.scale.set(scale, scale, scale)
        pulseGlow.material.opacity = 0.2 + Math.sin(time * 3) * 0.15
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

      {/* Légende */}
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
