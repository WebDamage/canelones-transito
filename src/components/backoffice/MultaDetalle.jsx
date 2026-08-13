import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ESTADOS_ADMINISTRATIVOS, actualizarEstadoAdministrativo } from '../../lib/multas'
import { firebaseReady } from '../../lib/firebase'
import { useAuth } from '../../context/AuthContext'

export default function MultaDetalle({ multa, puedeEditar, onClose, onUpdated, showToast }) {
  const [guardando, setGuardando] = useState(false)
  const { sesion } = useAuth()

  if (!multa) return null

  async function cambiarEstado(e) {
    const nuevo = e.target.value
    if (!firebaseReady) { showToast('Necesitás Firebase configurado para guardar cambios.', '', 3500); return }
    setGuardando(true)
    try {
      await actualizarEstadoAdministrativo(multa.uuid, nuevo, { cedula: sesion?.cedula, nombre: sesion?.nombre })
      onUpdated({ ...multa, estadoAdministrativo: nuevo })
      showToast('Estado actualizado', 'success', 2000)
    } catch (err) {
      showToast('No se pudo actualizar: ' + err.message, 'error')
    }
    setGuardando(false)
  }

  const geo = multa.geolocalizacion

  return (
    <div className="card p-4 sticky top-20">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">{multa.vehiculo?.placa || '(sin matrícula)'}</h3>
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{(multa.creadaEn || '').slice(0, 16).replace('T', ' ')}</p>
        </div>
        <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--color-ink-muted)' }} aria-label="Cerrar">×</button>
      </div>

      <Seccion titulo="Infracción">
        <p className="text-sm"><b>{multa.infraccion?.codigo}</b> · {multa.infraccion?.descripcion}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>Gravedad: {multa.infraccion?.gravedad}</p>
      </Seccion>

      <Seccion titulo="Vehículo">
        <Row label="Tipo" value={multa.vehiculo?.tipo} />
        <Row label="Marca/Modelo" value={[multa.vehiculo?.marca, multa.vehiculo?.modelo].filter(Boolean).join(' ')} />
        <Row label="Color" value={multa.vehiculo?.color} />
      </Seccion>

      {(multa.infractor?.nombre || multa.infractor?.cedula) && (
        <Seccion titulo="Infractor">
          <Row label="Nombre" value={multa.infractor?.nombre} />
          <Row label="Cédula" value={multa.infractor?.cedula} />
          <Row label="Licencia" value={multa.infractor?.licencia} />
        </Seccion>
      )}

      <Seccion titulo="Inspector">
        <Row label="Nombre" value={multa.inspectorNombre || multa.inspectorCedula} />
        <Row label="Equipo" value={multa.equipo} />
      </Seccion>

      {geo && (
        <Seccion titulo="Ubicación">
          <p className="text-sm">{geo.lat?.toFixed(5)}, {geo.lon?.toFixed(5)}</p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=17/${geo.lat}/${geo.lon}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs underline"
            style={{ color: 'var(--color-can-blue)' }}
          >
            Ver en el mapa
          </a>
        </Seccion>
      )}

      {multa.observaciones && (
        <Seccion titulo="Observaciones">
          <p className="text-sm">{multa.observaciones}</p>
        </Seccion>
      )}

      {(multa.fotosUrls?.length > 0) && (
        <Seccion titulo="Fotos">
          <div className="grid grid-cols-3 gap-2">
            {multa.fotosUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border block" style={{ borderColor: 'var(--color-border)' }}>
                <img src={url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </Seccion>
      )}

      {multa.videoUrl && (
        <Seccion titulo="Video">
          <video src={multa.videoUrl} controls className="w-full rounded-md border" style={{ borderColor: 'var(--color-border)' }} />
        </Seccion>
      )}

      {multa.firmaUrl && (
        <Seccion titulo="Firma">
          <img src={multa.firmaUrl} alt="firma" className="max-h-24 rounded-md border p-2" style={{ borderColor: 'var(--color-border)' }} />
        </Seccion>
      )}

      <Seccion titulo="Estado administrativo">
        {puedeEditar ? (
          <select value={multa.estadoAdministrativo || 'En proceso'} onChange={cambiarEstado} disabled={guardando}>
            {ESTADOS_ADMINISTRATIVOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        ) : (
          <p className="text-sm">{multa.estadoAdministrativo || 'En proceso'}</p>
        )}
      </Seccion>

      <Link
        to={`/panel/boleta/${multa.uuid}`}
        state={{ multa }}
        className="btn btn-outline text-sm w-full !min-h-0 !py-2.5"
      >
        Descargar boleta (PDF)
      </Link>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div className="mb-4 pb-4 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'var(--color-border)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>{titulo}</h4>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 text-sm py-0.5">
      <span style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
