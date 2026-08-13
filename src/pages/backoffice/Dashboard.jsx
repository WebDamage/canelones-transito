import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Toast from '../../components/Toast'
import FiltrosMultas from '../../components/backoffice/FiltrosMultas'
import MultasTable from '../../components/backoffice/MultasTable'
import MultaDetalle from '../../components/backoffice/MultaDetalle'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../context/AuthContext'
import { useToast } from '../../lib/useToast'
import { listarMultas, aplicarFiltros, calcularMetricas } from '../../lib/multas'

const FILTROS_VACIOS = { desde: '', hasta: '', inspector: '', equipo: '', codigo: '', estadoAdministrativo: '' }

export default function Dashboard() {
  const { sesion } = useAuth()
  const { toast, show } = useToast()
  const [items, setItems] = useState([])
  const [demo, setDemo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    listarMultas()
      .then(({ items, demo }) => { setItems(items); setDemo(demo) })
      .catch((err) => show('No se pudieron cargar las multas: ' + err.message, 'error'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = useMemo(() => aplicarFiltros(items, filtros), [items, filtros])
  const metricas = useMemo(() => calcularMetricas(items), [items])
  const puedeEditarEstado = sesion.rol === ROLES.ADMINISTRADOR || sesion.rol === ROLES.ADMINISTRATIVO

  function onUpdated(actualizada) {
    setItems((prev) => prev.map((m) => (m.uuid === actualizada.uuid ? actualizada : m)))
    setSeleccionada(actualizada)
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Hola, {sesion.nombre || sesion.cedula} · {sesion.rol}</p>
          {sesion.rol === ROLES.ADMINISTRADOR && (
            <Link to="/panel/usuarios" className="text-sm font-medium underline" style={{ color: 'var(--color-can-blue)' }}>Gestión de usuarios →</Link>
          )}
        </div>
        <h2 className="text-xl font-semibold mb-6">Panel de seguimiento</h2>

        {demo && (
          <div className="text-xs rounded-md p-3 mb-4" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            ⚠ Mostrando datos de ejemplo: falta configurar Firebase (ver README) para ver las multas reales.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Tile label="Multas de hoy" value={metricas.hoy} />
          <Tile label="Multas del mes" value={metricas.mes} />
          <Tile label="Total en el sistema" value={metricas.total} />
          <Tile label="Equipos con multas" value={metricas.equipos} />
        </div>

        <Link to="/panel/mapa" className="card p-4 mb-6 flex items-center justify-between hover:shadow-md transition" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-ink-muted)' }}>
              Mapa en tiempo real
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Inspectores activos en territorio + multas georreferenciadas, con los mismos filtros.</p>
          </div>
          <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--color-can-blue)' }}>Ver mapa →</span>
        </Link>

        <h3 className="text-sm font-semibold mb-2">Listado de multas</h3>
        <FiltrosMultas items={items} filtros={filtros} onChange={setFiltros} />

        {cargando ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Cargando…</p>
        ) : (
          <div className="grid md:grid-cols-[1fr_340px] gap-4 items-start">
            <MultasTable items={filtradas} seleccionada={seleccionada} onSelect={setSeleccionada} />
            {seleccionada && (
              <MultaDetalle
                multa={seleccionada}
                puedeEditar={puedeEditarEstado}
                onClose={() => setSeleccionada(null)}
                onUpdated={onUpdated}
                showToast={show}
              />
            )}
          </div>
        )}
      </main>
      <Toast toast={toast} />
    </div>
  )
}

function Tile({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>{label}</div>
    </div>
  )
}
