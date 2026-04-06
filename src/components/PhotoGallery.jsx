// Galerie photo — grille de miniatures + visionneuse plein écran (lightbox)
import { useState, useEffect, useCallback } from 'react'

const PhotoGallery = ({ photos = [], city = '' }) => {
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const isOpen = lightboxIndex >= 0

  const openLightbox = (index) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(-1)

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Navigation clavier
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, goNext, goPrev])

  // Bloquer le scroll quand lightbox ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (photos.length === 0) return null

  return (
    <>
      {/* Grille de miniatures */}
      <div className={`gallery-grid gallery-count-${Math.min(photos.length, 4)}`}>
        {photos.map((photo, i) => (
          <div
            key={i}
            className={`gallery-thumb ${i === 0 ? 'gallery-thumb-main' : ''}`}
            onClick={() => openLightbox(i)}
          >
            <img src={photo} alt={`${city} ${i + 1}`} loading="lazy" />
            {i === 3 && photos.length > 4 && (
              <div className="gallery-more">+{photos.length - 4}</div>
            )}
          </div>
        )).slice(0, 4)}
      </div>

      {/* Lightbox plein écran */}
      {isOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Fermer */}
            <button className="lightbox-close" onClick={closeLightbox}>
              &times;
            </button>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <button className="lightbox-nav lightbox-prev" onClick={goPrev}>
                  &#8249;
                </button>
                <button className="lightbox-nav lightbox-next" onClick={goNext}>
                  &#8250;
                </button>
              </>
            )}

            {/* Image principale */}
            <img
              src={photos[lightboxIndex]}
              alt={`${city} ${lightboxIndex + 1}`}
              className="lightbox-image"
            />

            {/* Compteur */}
            <div className="lightbox-counter">
              {lightboxIndex + 1} / {photos.length}
            </div>

            {/* Miniatures en bas */}
            {photos.length > 1 && (
              <div className="lightbox-thumbs">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className={`lightbox-thumb ${i === lightboxIndex ? 'lightbox-thumb-active' : ''}`}
                    onClick={() => setLightboxIndex(i)}
                  >
                    <img src={photo} alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default PhotoGallery
