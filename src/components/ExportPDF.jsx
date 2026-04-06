// Export PDF du carnet de voyage — génère une page imprimable
import { useProject } from '../contexts/ProjectContext'

const TRANSPORT_LABELS = {
  plane: 'Avion', boat: 'Bateau', car: 'Voiture', bus: 'Bus',
  train: 'Train', bike: 'Vélo', walk: 'À pied',
  motorcycle: 'Moto', hitchhike: 'Auto-stop', other: 'Autre',
}

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const ExportPDF = ({ trips = [], posts = [] }) => {
  const { project } = useProject()

  const handleExport = () => {
    const validTrips = trips.filter(t => t.latitude && t.longitude)
    const countries = [...new Set(validTrips.map(t => t.country).filter(Boolean))]
    const totalKm = validTrips.reduce((sum, t, i) => {
      if (i === 0) return 0
      return sum + haversineKm(validTrips[i - 1].latitude, validTrips[i - 1].longitude, t.latitude, t.longitude)
    }, 0)

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const stagesHtml = validTrips.map((t, i) => {
      const photoHtml = (t.photos?.length > 0 ? t.photos : (t.photoUrl ? [t.photoUrl] : []))
        .slice(0, 3)
        .map(p => `<img src="${p}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;" />`)
        .join('')

      return `
        <div style="margin-bottom:20px;padding:14px;border:1px solid #e0d5c4;border-radius:8px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h3 style="margin:0;color:#2a2620;font-size:16px;">${i + 1}. ${t.city || 'Inconnu'}${t.country ? ', ' + t.country : ''}</h3>
              <div style="color:#8a7d6d;font-size:12px;margin-top:4px;">
                ${t.arrivalDate ? new Date(t.arrivalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                ${t.transport ? ' · ' + (TRANSPORT_LABELS[t.transport] || '') : ''}
              </div>
            </div>
          </div>
          ${t.notes ? `<p style="color:#555;font-style:italic;font-size:13px;margin:8px 0 0;">${t.notes}</p>` : ''}
          ${photoHtml ? `<div style="display:flex;gap:6px;margin-top:10px;">${photoHtml}</div>` : ''}
        </div>
      `
    }).join('')

    const postsHtml = posts.slice(0, 10).map(p => {
      const date = p.createdAt?.toDate?.()
      return `
        <div style="margin-bottom:14px;padding:12px;border:1px solid #e8e0d6;border-radius:8px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <strong style="color:#2a2620;font-size:13px;">${p.authorName || 'Voyageur'}</strong>
            ${p.location ? `<span style="color:#8a7d6d;font-size:12px;">${p.location}${p.country ? ', ' + p.country : ''}</span>` : ''}
          </div>
          <p style="color:#333;font-size:13px;margin:0;line-height:1.5;">${p.text || ''}</p>
          ${date ? `<div style="color:#aaa;font-size:11px;margin-top:6px;">${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wanderlog — ${project?.name || 'Carnet de voyage'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; color: #2a2620; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 28px; margin-bottom: 4px; }
          h2 { font-size: 18px; color: #b8862e; margin: 30px 0 14px; border-bottom: 2px solid #e8dcc8; padding-bottom: 6px; }
          .subtitle { color: #8a7d6d; font-size: 14px; margin-bottom: 20px; }
          .stats-row { display: flex; gap: 24px; margin: 16px 0 24px; padding: 12px 16px; background: #faf6f0; border-radius: 8px; }
          .stat { text-align: center; }
          .stat-value { font-size: 22px; font-weight: bold; color: #b8862e; display: block; }
          .stat-label { font-size: 11px; color: #8a7d6d; text-transform: uppercase; }
          .footer { margin-top: 40px; text-align: center; color: #bbb; font-size: 11px; border-top: 1px solid #e8dcc8; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>&#9992; ${project?.name || 'Mon voyage'}</h1>
        <p class="subtitle">${project?.description || ''}</p>

        <div class="stats-row">
          <div class="stat"><span class="stat-value">${validTrips.length}</span><span class="stat-label">&eacute;tapes</span></div>
          <div class="stat"><span class="stat-value">${countries.length}</span><span class="stat-label">pays</span></div>
          <div class="stat"><span class="stat-value">${Math.round(totalKm).toLocaleString('fr-FR')}</span><span class="stat-label">km</span></div>
          <div class="stat"><span class="stat-value">${posts.length}</span><span class="stat-label">posts</span></div>
        </div>

        ${countries.length > 0 ? `<p style="color:#8a7d6d;font-size:13px;margin-bottom:20px;">Pays : ${countries.join(', ')}</p>` : ''}

        <h2>&#128205; &Eacute;tapes du voyage</h2>
        ${stagesHtml || '<p style="color:#aaa;">Aucune étape</p>'}

        ${postsHtml ? `<h2>&#128221; Journal de bord</h2>${postsHtml}` : ''}

        <div class="footer">
          Wanderlog &mdash; ${project?.name || 'Carnet de voyage'} &mdash; Code : ${project?.code || ''}<br/>
          Export&eacute; le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    // Attendre le chargement des images avant impression
    setTimeout(() => {
      printWindow.print()
    }, 800)
  }

  return (
    <button className="export-pdf-btn" onClick={handleExport} title="Exporter en PDF">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
      <span>Exporter PDF</span>
    </button>
  )
}

export default ExportPDF
