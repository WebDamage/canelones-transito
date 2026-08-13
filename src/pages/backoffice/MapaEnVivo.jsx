import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Toast from '../../components/Toast'
import LeafletMap from '../../components/backoffice/LeafletMap'
import FiltrosMultas from '../../components/backoffice/FiltrosMultas'
import MultaDetalle from '../../components/backoffice/MultaDetalle'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../context/AuthContext'
import { useToast } from '../../lib/useToast'
import { listarMultas, aplicarFiltros } from '../../lib/multas'
import { listarUbicacionesActivas, ACTIVO_UMBRAL_MIN } from '../../lib/tracking'
import { firebaseReady } from '../../lib/firebase'
import MULTAS_DEMO from '../../data/multasDemo'

const FILTROS_VACIOS = { desde: '', hasta: '', inspector: '', equipo: '', codigo: '', estadoAdministrativo: '' }
const ACTUALIZAR_CADA_MS = 30000

export default function MapaEnVivo() {
  const { sesion } = useAuth()
  const { toast, show } = useToast()
  const [multas, setMultas] = useState([])
  const [inspectores, setInspectores] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [seleccionada, setSeleccionada] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarMultas = useCallback(async () => {
    try {
      const { items } = await listarMultas()
      setMultas(items)
    } catch (err) {
      show('No se pudieron cargar las multas: ' + err.message, 'error')
    }
  }, [show])

  const cargarInspectores = useCallback(async () => {
    if (!firebaseReady) {
      // Demo: dos inspectores "activos" alrededor de Canelones, solo para
      // previsualizar el mapa sin depender de tener Firebase configurado.
      setInspectores([
        { cedula: '22222222', nombre: 'María Rodríguez', equipo: 'Equipo 1', lat: -34.7546, lon: -56.1636 },
        { cedula: '33333333', nombre: 'Lucía Fernández', equipo: 'Equipo 2', lat: -34.7480, lon: -56.1560 },
      ])
      return
    }
    try {
      setInspectores(await listarUbicacionesActivas())
    } catch (err) { /* no crítico, se reintenta en el próximo ciclo */ }
  }, [])

  useEffect(() => {
    Promise.all([cargarMultas(), cargarInspectores()]).finally(() => setCargando(false))
    const id = setInterval(cargarInspectores, ACTUALIZAR_CADA_MS)
    return () => clearInterval(id)
  }, [cargarMultas, cargarInspectores])

  const filtradas = useMemo(() => aplicarFiltros(multas, filtros), [multas, filtros])
  const inspectoresFiltrados = useMemo(() => {
    if (!filtros.inspector && !filtros.equipo) return inspectores
    return inspectores.filter((i) => (!filtros.inspector || i.cedula === filtros.inspector) && (!filtros.equipo || i.equipo === filtros.equipo))
  }, [inspectores, filtros])

  const puedeEditarEstado = sesion.rol === ROLES.ADMINISTRADOR || sesion.rol === ROLES.ADMINISTRATIVO
  const demo = !firebaseReady

  function onUpdated(actualizada) {
    setMultas((prev) => prev.map((m) => (m.uuid === actualizada.uuid ? actualizada : m)))
    setSeleccionada(actualizada)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto px-4 pt-4 w-full">
        <Link to="/panel" className="text-sm underline" style={{ color: 'var(--color-can-blue)' }}>← Volver al panel</Link>
        <div className="flex items-center justify-between mt-2 mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-semibold">Mapa en tiempo real</h2>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#1e8e3e' }} /> Inspectores activos (últimos {ACTIVO_UMBRAL_MIN} min)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#c62828' }} /> Multas</span>
          </div>
        </div>
        {demo && (
          <div className="text-xs rounded-md p-3 mb-3" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            ⚠ Mostrando datos de ejemplo: falta configurar Firebase (ver README) para ver inspectores y multas reales.
          </div>
        )}
        <FiltrosMultas items={multas.length ? multas : MULTAS_DEMO} filtros={filtros} onChange={setFiltros} />
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-6 w-full flex-1 grid md:grid-cols-[1fr_340px] gap-4 items-start" style={{ minHeight: 480 }}>
        <div className="card overflow-hidden" style={{ height: 520 }}>
          {cargando ? (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Cargando mapa…</div>
          ) : (
            <LeafletMap inspectores={inspectoresFiltrados} multas={filtradas} onSelectMulta={setSeleccionada} />
          )}
        </div>
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
      <Toast toast={toast} />
    </div>
  )
}
