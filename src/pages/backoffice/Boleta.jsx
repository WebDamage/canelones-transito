import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import Header from '../../components/Header'
import { listarMultas } from '../../lib/multas'

// Boleta imprimible / "exportable a PDF" sin depender de una librería de PDF:
// se apoya en window.print() + CSS de impresión (ver #boleta-imprimible en
// index.css), que en cualquier navegador moderno ofrece "Guardar como PDF"
// como destino de impresión. Evita sumar ~300KB de jsPDF al bundle para un
// piloto que puede resolver esto con lo que el navegador ya trae.
export default function Boleta() {
  const { uuid } = useParams()
  const location = useLocation()
  const [multa, setMulta] = useState(location.state?.multa || null)
  const [cargando, setCargando] = useState(!location.state?.multa)
  const [error, setError] = useState('')

  useEffect(() => {
    if (multa) return
    listarMultas()
      .then(({ items }) => {
        const encontrada = items.find((m) => m.uuid === uuid)
        if (!encontrada) setError('No se encontró esa multa.')
        setMulta(encontrada || null)
      })
      .catch((err) => setError('No se pudo cargar: ' + err.message))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen">
      <div className="print-hidden">
        <Header />
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="print-hidden flex items-center justify-between mb-6">
          <Link to="/panel" className="text-sm font-medium underline" style={{ color: 'var(--color-can-blue)' }}>← Volver al panel</Link>
          {multa && (
            <button onClick={() => window.print()} className="btn btn-primary text-sm !min-h-0 !py-2">
              Imprimir / Guardar como PDF
            </button>
          )}
        </div>

        {cargando && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Cargando…</p>}
        {error && <p className="text-sm" style={{ color: 'var(--color-danger, #b91c1c)' }}>{error}</p>}

        {multa && (
          <div id="boleta-imprimible" className="card p-8">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <img src={`${import.meta.env.BASE_URL}logo-canelones.png`} alt="Gobierno de Canelones" className="h-14 w-14 object-contain" />
              <div>
                <h1 className="text-lg font-semibold">Intendencia de Canelones</h1>
                <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Boleta de contravención de tránsito</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <Campo label="N° / UUID" value={multa.uuid} />
              <Campo label="Fecha y hora" value={(multa.creadaEn || '').slice(0, 16).replace('T', ' ')} />
              <Campo label="Inspector" value={multa.inspectorNombre || multa.inspectorCedula} />
              <Campo label="Equipo" value={multa.equipo} />
            </div>

            <Seccion titulo="Infracción">
              <p className="text-sm"><b>{multa.infraccion?.codigo}</b> · {multa.infraccion?.descripcion}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>Gravedad: {multa.infraccion?.gravedad}</p>
            </Seccion>

            <Seccion titulo="Vehículo">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Campo label="Matrícula" value={multa.vehiculo?.placa} />
                <Campo label="Tipo" value={multa.vehiculo?.tipo} />
                <Campo label="Marca/Modelo" value={[multa.vehiculo?.marca, multa.vehiculo?.modelo].filter(Boolean).join(' ')} />
                <Campo label="Color" value={multa.vehiculo?.color} />
              </div>
            </Seccion>

            {(multa.infractor?.nombre || multa.infractor?.cedula) && (
              <Seccion titulo="Infractor">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Campo label="Nombre" value={multa.infractor?.nombre} />
                  <Campo label="Cédula" value={multa.infractor?.cedula} />
                  <Campo label="Licencia" value={multa.infractor?.licencia} />
                </div>
              </Seccion>
            )}

            {multa.geolocalizacion && (
              <Seccion titulo="Ubicación">
                <p className="text-sm">{multa.geolocalizacion.lat?.toFixed(5)}, {multa.geolocalizacion.lon?.toFixed(5)}</p>
              </Seccion>
            )}

            {multa.observaciones && (
              <Seccion titulo="Observaciones">
                <p className="text-sm">{multa.observaciones}</p>
              </Seccion>
            )}

            <Seccion titulo="Estado administrativo">
              <p className="text-sm">{multa.estadoAdministrativo || 'En proceso'}</p>
            </Seccion>

            {multa.firmaUrl && (
              <div className="mt-6">
                <p className="text-xs mb-1" style={{ color: 'var(--color-ink-muted)' }}>Firma del infractor</p>
                <img src={multa.firmaUrl} alt="firma" className="max-h-20 border rounded-md p-2" style={{ borderColor: 'var(--color-border)' }} />
              </div>
            )}

            <p className="text-[10px] mt-8 pt-3 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}>
              Documento generado por el Sistema de Gestión de Infracciones de Tránsito — Intendencia de Canelones.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div className="mb-4 pb-4 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
      <h4 className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>{titulo}</h4>
      {children}
    </div>
  )
}

function Campo({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
