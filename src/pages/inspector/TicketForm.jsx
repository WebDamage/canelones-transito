import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import InfraccionPicker from '../../components/InfraccionPicker'
import CameraCapture from '../../components/CameraCapture'
import GeoCapture from '../../components/GeoCapture'
import SignaturePad from '../../components/SignaturePad'
import Toast from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../lib/useToast'
import { idbPut, idbGet, idbDel } from '../../lib/idb'
import { nuevoUUID } from '../../lib/media'
import { sincronizarMulta } from '../../lib/sync'
import { firebaseReady } from '../../lib/firebase'

const PASOS = ['Vehículo y evidencia', 'Infracción e infractor', 'Ubicación', 'Firma y guardar']

function nowLocalDatetime() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d - tzOffset).toISOString().slice(0, 16)
}

function estadoInicial(uuid) {
  return {
    uuid,
    fecha: nowLocalDatetime(),
    vehiculo: { placa: '', tipo: '', marca: '', modelo: '', color: '' },
    infraccion: null,
    infractor: { nombre: '', cedula: '', licencia: '' },
    fotos: [],
    video: '',
    geo: null,
    observaciones: '',
    firma: '',
  }
}

export default function TicketForm() {
  const { sesion } = useAuth()
  const navigate = useNavigate()
  const { toast, show } = useToast()
  const [paso, setPaso] = useState(0)
  const [data, setData] = useState(() => estadoInicial(nuevoUUID()))
  const [guardando, setGuardando] = useState(false)
  const saveTimer = useRef(null)

  // Restaurar borrador si existe (p. ej. la app se cerró a mitad de una boleta)
  useEffect(() => {
    idbGet('borrador', 'actual').then((d) => {
      if (d) {
        setData(d)
        show('Se recuperó una boleta sin terminar', '', 3000)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autoguardado del borrador (debounce)
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      idbPut('borrador', data, 'actual').catch(() => {})
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [data])

  const setField = useCallback((path, value) => {
    setData((prev) => {
      const next = { ...prev }
      if (path.includes('.')) {
        const [grupo, campo] = path.split('.')
        next[grupo] = { ...prev[grupo], [campo]: value }
      } else {
        next[path] = value
      }
      return next
    })
  }, [])

  function validarPaso(p) {
    if (p === 0 && !data.vehiculo.placa.trim()) return 'Ingresá la matrícula del vehículo.'
    if (p === 1 && !data.infraccion) return 'Seleccioná el código de infracción.'
    return null
  }

  function siguiente() {
    const err = validarPaso(paso)
    if (err) { show(err, 'error'); return }
    setPaso((p) => Math.min(p + 1, PASOS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function anterior() {
    setPaso((p) => Math.max(p - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardar() {
    const errVehiculo = validarPaso(0)
    const errInfraccion = validarPaso(1)
    if (errVehiculo || errInfraccion) {
      show(errVehiculo || errInfraccion, 'error')
      setPaso(errVehiculo ? 0 : 1)
      return
    }
    setGuardando(true)
    const multa = {
      ...data,
      inspectorCedula: sesion.cedula,
      inspectorNombre: sesion.nombre,
      equipo: sesion.equipo || null,
      estado: 'pendiente',
      guardadoEn: new Date().toISOString(),
    }
    try {
      await idbPut('cola', multa)
      await idbDel('borrador', 'actual')
    } catch (err) {
      show('Error al guardar en el dispositivo: ' + err.message, 'error', 5000)
      setGuardando(false)
      return
    }
    show('✓ Boleta guardada en el dispositivo', 'success')

    if (navigator.onLine && firebaseReady) {
      try {
        await sincronizarMulta(multa, { cedulaInspector: sesion.cedula })
        await idbPut('cola', { ...multa, estado: 'enviado', enviadoEn: new Date().toISOString() })
        show('✓ Boleta guardada y sincronizada', 'success')
      } catch (err) {
        show('Guardada en el dispositivo. No se pudo sincronizar todavía.', '', 4000)
      }
    }

    setGuardando(false)
    navigate('/inspector')
  }

  const infraccion = data.infraccion

  return (
    <div className="min-h-screen pb-10">
      <Header />
      <main className="max-w-md mx-auto px-4 py-5">
        {/* Progreso */}
        <div className="flex items-center gap-1.5 mb-1">
          {PASOS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= paso ? 'var(--color-can-blue)' : 'var(--color-border)' }} />
          ))}
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--color-ink-muted)' }}>Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}</p>

        {paso === 0 && (
          <div className="card p-4 space-y-3">
            <div className="field">
              <label>Matrícula del vehículo *</label>
              <input value={data.vehiculo.placa} onChange={(e) => setField('vehiculo.placa', e.target.value.toUpperCase())} placeholder="Ej: SBC 1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label>Tipo de vehículo</label>
                <select value={data.vehiculo.tipo} onChange={(e) => setField('vehiculo.tipo', e.target.value)}>
                  <option value="">Seleccionar…</option>
                  <option>Auto</option><option>Moto</option><option>Camioneta</option><option>Camión</option><option>Ómnibus</option><option>Otro</option>
                </select>
              </div>
              <div className="field">
                <label>Color</label>
                <input value={data.vehiculo.color} onChange={(e) => setField('vehiculo.color', e.target.value)} />
              </div>
              <div className="field">
                <label>Marca</label>
                <input value={data.vehiculo.marca} onChange={(e) => setField('vehiculo.marca', e.target.value)} />
              </div>
              <div className="field">
                <label>Modelo</label>
                <input value={data.vehiculo.modelo} onChange={(e) => setField('vehiculo.modelo', e.target.value)} />
              </div>
            </div>
            <hr style={{ borderColor: 'var(--color-border)' }} />
            <CameraCapture
              fotos={data.fotos}
              onFotosChange={(f) => setField('fotos', f)}
              video={data.video}
              onVideoChange={(v) => setField('video', v)}
              placa={data.vehiculo.placa}
            />
          </div>
        )}

        {paso === 1 && (
          <div className="card p-4 space-y-4">
            <div className="field">
              <label>Fecha y hora</label>
              <input type="datetime-local" value={data.fecha} onChange={(e) => setField('fecha', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-ink-soft)' }}>Código de infracción *</label>
              <InfraccionPicker value={infraccion} onChange={(v) => setField('infraccion', v)} />
            </div>
            <hr style={{ borderColor: 'var(--color-border)' }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>Datos del infractor (si aplica)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="field col-span-2">
                <label>Nombre</label>
                <input value={data.infractor.nombre} onChange={(e) => setField('infractor.nombre', e.target.value)} />
              </div>
              <div className="field">
                <label>Cédula</label>
                <input inputMode="numeric" value={data.infractor.cedula} onChange={(e) => setField('infractor.cedula', e.target.value)} />
              </div>
              <div className="field">
                <label>Licencia</label>
                <input value={data.infractor.licencia} onChange={(e) => setField('infractor.licencia', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="card p-4 space-y-4">
            <GeoCapture geo={data.geo} onChange={(g) => setField('geo', g)} />
            {!data.geo && (
              <p className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠ Recomendado: capturá la ubicación antes de guardar la boleta.</p>
            )}
            <div className="field">
              <label>Observaciones</label>
              <textarea rows={4} value={data.observaciones} onChange={(e) => setField('observaciones', e.target.value)} />
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-ink-muted)' }}>Resumen</h3>
              <dl className="text-sm space-y-1.5">
                <Row label="Matrícula" value={data.vehiculo.placa || '—'} />
                <Row label="Infracción" value={infraccion ? `${infraccion.codigo} · ${infraccion.gravedad}` : '—'} />
                <Row label="Fecha" value={data.fecha?.replace('T', ' ') || '—'} />
                <Row label="Fotos" value={`${data.fotos.length} foto(s)${data.video ? ' + video' : ''}`} />
                <Row label="Ubicación" value={data.geo ? `${data.geo.lat.toFixed(5)}, ${data.geo.lon.toFixed(5)}` : 'No capturada'} />
              </dl>
            </div>
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-muted)' }}>Firma</h3>
              <p className="text-xs mb-2" style={{ color: 'var(--color-ink-muted)' }}>Del infractor o, en su defecto, del inspector.</p>
              <SignaturePad value={data.firma} onChange={(f) => setField('firma', f)} />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {paso > 0 && <button type="button" onClick={anterior} className="btn btn-outline flex-1">Anterior</button>}
          {paso < PASOS.length - 1 && <button type="button" onClick={siguiente} className="btn btn-primary flex-1">Siguiente</button>}
          {paso === PASOS.length - 1 && (
            <button type="button" onClick={guardar} disabled={guardando} className="btn btn-primary flex-1">
              {guardando ? 'Guardando…' : 'Guardar boleta'}
            </button>
          )}
        </div>
        {!navigator.onLine && (
          <p className="text-xs text-center mt-3" style={{ color: 'var(--color-ink-muted)' }}>Sin conexión: la boleta se guarda en el dispositivo y se sincroniza sola cuando vuelva la señal.</p>
        )}
      </main>
      <Toast toast={toast} />
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: 'var(--color-ink-muted)' }}>{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
