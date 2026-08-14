import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import Toast from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../lib/useToast'
import { idbAll, idbPut, idbDel } from '../../lib/idb'
import { sincronizarMulta } from '../../lib/sync'
import { firebaseReady } from '../../lib/firebase'
import { iniciarSeguimiento, detenerSeguimiento, estaCompartiendoUbicacion } from '../../lib/tracking'

export default function InspectorHome() {
  const { sesion } = useAuth()
  const navigate = useNavigate()
  const { toast, show } = useToast()
  const [items, setItems] = useState([])
  const [sincronizando, setSincronizando] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  // Se inicializa leyendo si el seguimiento ya está en marcha (módulo
  // independiente del ciclo de vida de esta pantalla — sigue activo si el
  // inspector navega a cargar una boleta y vuelve). Solo se apaga con el
  // toggle o al cerrar/recargar la pestaña.
  const [compartiendo, setCompartiendo] = useState(estaCompartiendoUbicacion)

  const cargar = useCallback(async () => {
    const all = await idbAll('cola').catch(() => [])
    all.sort((a, b) => (b.guardadoEn || '').localeCompare(a.guardadoEn || ''))
    setItems(all)
  }, [])

  useEffect(() => {
    cargar()
    const onOnline = () => { setOnline(true); cargar() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [cargar])

  async function sincronizarPendientes() {
    if (!firebaseReady) { show('Falta configurar Firebase para sincronizar (ver README).', '', 4000); return }
    if (!online) { show('Sin conexión. Se sincroniza cuando vuelva la señal.', '', 3000); return }
    const pendientes = items.filter((i) => i.estado === 'pendiente')
    if (!pendientes.length) { show('No hay boletas pendientes.', '', 2500); return }
    setSincronizando(true)
    let ok = 0, fail = 0
    let ultimoError = ''
    for (const it of pendientes) {
      try {
        await sincronizarMulta(it, { cedulaInspector: sesion.cedula })
        await idbPut('cola', { ...it, estado: 'enviado', enviadoEn: new Date().toISOString() })
        ok++
      } catch (err) {
        fail++
        ultimoError = err.message || String(err)
        console.error('Error al sincronizar boleta', it.uuid, err)
      }
    }
    setSincronizando(false)
    await cargar()
    if (ok && !fail) show(`✓ ${ok} boleta(s) sincronizada(s)`, 'success')
    else show(`${ok} enviada(s), ${fail} con error: ${ultimoError}`, fail ? 'error' : 'success', 7000)
  }

  async function eliminar(uuid) {
    if (!confirm('¿Eliminar esta boleta del dispositivo? No se puede deshacer.')) return
    await idbDel('cola', uuid)
    cargar()
  }

  function toggleCompartir() {
    if (!firebaseReady) { show('Falta configurar Firebase para compartir tu ubicación (ver README).', '', 4000); return }
    if (compartiendo) {
      detenerSeguimiento(sesion.cedula)
      setCompartiendo(false)
      show('Dejaste de compartir tu ubicación', '', 2500)
    } else {
      iniciarSeguimiento(sesion, (err) => { show(err, 'error', 4000); setCompartiendo(false) })
      setCompartiendo(true)
      show('Compartiendo tu ubicación con el panel de seguimiento', 'success', 2500)
    }
  }


  const pendientes = items.filter((i) => i.estado === 'pendiente').length

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Hola, {sesion.nombre || sesion.cedula}</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={online ? { background: 'var(--color-success-light)', color: 'var(--color-success)' } : { background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            {online ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
        <h2 className="text-xl font-semibold mb-6">Panel del inspector</h2>

        <button onClick={() => navigate('/inspector/nueva')} className="btn btn-primary w-full !min-h-16 text-base">
          + Nueva infracción
        </button>

        <div className="card p-4 mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Compartir mi ubicación</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              {compartiendo ? 'El panel de seguimiento puede ver dónde estás.' : 'Activalo para que el panel te vea en el mapa en vivo.'}
            </p>
          </div>
          <button
            onClick={toggleCompartir}
            role="switch"
            aria-checked={compartiendo}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition"
            style={{ background: compartiendo ? 'var(--color-can-green)' : 'var(--color-border)' }}
          >
            <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition" style={{ left: compartiendo ? 26 : 4 }} />
          </button>
        </div>

        <div className="card p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>
              Mis boletas en este dispositivo
            </h3>
            {pendientes > 0 && (
              <button onClick={sincronizarPendientes} disabled={sincronizando} className="text-xs font-medium underline" style={{ color: 'var(--color-can-blue)' }}>
                {sincronizando ? 'Sincronizando…' : `Sincronizar (${pendientes})`}
              </button>
            )}
          </div>

          {items.length === 0 && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Todavía no hay boletas guardadas.</p>}

          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {items.map((it) => (
              <li key={it.uuid} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.vehiculo?.placa || '(sin matrícula)'} · {it.infraccion?.codigo || '—'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-ink-muted)' }}>{(it.guardadoEn || '').slice(0, 16).replace('T', ' ')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={it.estado === 'enviado' ? { background: 'var(--color-success-light)', color: 'var(--color-success)' } : { background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
                  >
                    {it.estado === 'enviado' ? 'Enviada' : 'Pendiente'}
                  </span>
                  <button onClick={() => eliminar(it.uuid)} aria-label="Eliminar" className="text-lg leading-none" style={{ color: 'var(--color-ink-muted)' }}>×</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Toast toast={toast} />
    </div>
  )
}
