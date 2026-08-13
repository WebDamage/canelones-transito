import { useState } from 'react'

const PRECISION_ALERTA_M = 50

/**
 * Captura de geolocalización con alerta de baja precisión y corrección manual.
 * El mini-mapa usa un embed liviano de OpenStreetMap (sin traer Leaflet
 * todavía — el mapa interactivo completo llega en la Fase 4 del panel).
 */
export default function GeoCapture({ geo, onChange }) {
  const [obteniendo, setObteniendo] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [manual, setManual] = useState(false)

  function capturar() {
    setErrorMsg('')
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalización no disponible en este navegador.')
      return
    }
    setObteniendo(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, manual: false })
        setObteniendo(false)
      },
      (err) => {
        setErrorMsg(err.code === 1 ? 'Permiso denegado. Habilitá la ubicación en tu dispositivo.' : 'No se pudo obtener la ubicación.')
        setObteniendo(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  function corregirManual(campo, valor) {
    const num = parseFloat(valor)
    onChange({ ...(geo || { lat: 0, lon: 0, acc: 0 }), [campo]: Number.isNaN(num) ? 0 : num, manual: true })
  }

  const bajaPrecision = geo && geo.acc != null && geo.acc > PRECISION_ALERTA_M

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={capturar} disabled={obteniendo} className="btn btn-primary text-sm">
          {obteniendo ? 'Obteniendo…' : geo ? 'Volver a capturar GPS' : '📍 Capturar ubicación'}
        </button>
        <button type="button" onClick={() => setManual((m) => !m)} className="btn btn-outline text-xs !min-h-0 !py-2">
          {manual ? 'Ocultar corrección manual' : 'Corregir manualmente'}
        </button>
      </div>

      {errorMsg && <p className="text-xs mb-2" style={{ color: 'var(--color-danger)' }}>⚠ {errorMsg}</p>}

      {geo && (
        <div className="text-sm rounded-md border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-page)' }}>
          <div>
            <b>{geo.lat.toFixed(6)}, {geo.lon.toFixed(6)}</b>
            {geo.manual && <span className="ml-2 text-xs" style={{ color: 'var(--color-ink-muted)' }}>(corregida manualmente)</span>}
          </div>
          {geo.acc != null && (
            <div className="text-xs mt-1" style={{ color: bajaPrecision ? 'var(--color-warning)' : 'var(--color-ink-muted)' }}>
              Precisión ±{Math.round(geo.acc)}m {bajaPrecision && '— baja precisión, confirmá o corregí la ubicación'}
            </div>
          )}
          <a
            href={`https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=17/${geo.lat}/${geo.lon}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs underline"
            style={{ color: 'var(--color-can-blue)' }}
          >
            Ver en el mapa
          </a>
          <div className="mt-2 rounded-md overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            <iframe
              title="mini-mapa"
              className="w-full"
              height="140"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.003}%2C${geo.lat - 0.002}%2C${geo.lon + 0.003}%2C${geo.lat + 0.002}&marker=${geo.lat}%2C${geo.lon}`}
            />
          </div>
        </div>
      )}

      {manual && (
        <div className="row2 grid grid-cols-2 gap-2 mt-2">
          <div className="field">
            <label>Latitud</label>
            <input type="number" step="0.000001" value={geo?.lat ?? ''} onChange={(e) => corregirManual('lat', e.target.value)} />
          </div>
          <div className="field">
            <label>Longitud</label>
            <input type="number" step="0.000001" value={geo?.lon ?? ''} onChange={(e) => corregirManual('lon', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}
