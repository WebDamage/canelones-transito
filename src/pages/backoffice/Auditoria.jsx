import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import { listarAuditoria } from '../../lib/auditoria'
import { firebaseReady } from '../../lib/firebase'

const ETIQUETAS_TIPO = {
  multa_creada: 'Multa creada',
  multa_estado_cambiado: 'Estado de multa modificado',
  usuario_guardado: 'Usuario dado de alta/editado',
  usuario_estado_cambiado: 'Usuario dado de baja/reactivado',
}

function resumirDetalle(tipo, detalle) {
  if (!detalle) return '—'
  if (tipo === 'multa_creada') return `${detalle.placa || '(sin matrícula)'} · ${detalle.codigo || ''}`
  if (tipo === 'multa_estado_cambiado') return `→ ${detalle.nuevoEstado}`
  if (tipo === 'usuario_guardado') return `${detalle.cedula} · ${detalle.rol}`
  if (tipo === 'usuario_estado_cambiado') return `${detalle.cedula} · ${detalle.activo ? 'activo' : 'de baja'}`
  return JSON.stringify(detalle)
}

export default function Auditoria() {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listarAuditoria()
      .then(setItems)
      .catch((err) => setError('No se pudo cargar la auditoría: ' + err.message))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/panel" className="text-sm underline" style={{ color: 'var(--color-can-blue)' }}>← Volver al panel</Link>
        <h2 className="text-xl font-semibold mt-2 mb-1">Auditoría</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-muted)' }}>
          Historial de eventos: creación de multas, cambios de estado y gestión de usuarios. No se puede editar ni
          borrar — cada evento queda escrito de forma permanente (ver reglas de Firestore).
        </p>

        {!firebaseReady && (
          <div className="text-xs rounded-md p-3 mb-4" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            ⚠ Falta configurar Firebase: la auditoría solo se registra cuando la app está conectada a un proyecto real.
          </div>
        )}

        {cargando && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Cargando…</p>}
        {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

        {!cargando && !error && firebaseReady && items.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Todavía no hay eventos registrados.</p>
        )}

        {items.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
                  {['Fecha', 'Evento', 'Detalle', 'Actor'].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((ev) => (
                  <tr key={ev.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-ink-muted)' }}>
                      {(ev.creadoEn || '').slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="px-3 py-2 font-medium">{ETIQUETAS_TIPO[ev.tipo] || ev.tipo}</td>
                    <td className="px-3 py-2">{resumirDetalle(ev.tipo, ev.detalle)}</td>
                    <td className="px-3 py-2">{ev.actorNombre || ev.actorCedula || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
