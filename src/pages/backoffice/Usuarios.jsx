import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Toast from '../../components/Toast'
import { useToast } from '../../lib/useToast'
import { listarUsuarios, guardarUsuario, cambiarActivo } from '../../lib/usuarios'
import { validarCedulaUY } from '../../lib/cedula'
import { ROLES } from '../../context/AuthContext'
import { firebaseReady } from '../../lib/firebase'

const FORM_VACIO = { cedula: '', nombre: '', rol: ROLES.INSPECTOR, equipo: '', activo: true }

export default function Usuarios() {
  const { toast, show } = useToast()
  const [items, setItems] = useState([])
  const [demo, setDemo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null) // null = form cerrado
  const [guardando, setGuardando] = useState(false)

  function cargar() {
    setCargando(true)
    listarUsuarios()
      .then(({ items, demo }) => { setItems(items); setDemo(demo) })
      .catch((err) => show('No se pudieron cargar los usuarios: ' + err.message, 'error'))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, []) // eslint-disable-line react-hooks/exhaustive-deps

  function abrirNuevo() { setForm(FORM_VACIO) }
  function abrirEditar(u) { setForm({ cedula: u.cedula, nombre: u.nombre, rol: u.rol, equipo: u.equipo || '', activo: u.activo !== false }) }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validarCedulaUY(form.cedula)) { show('La cédula no es válida.', 'error'); return }
    if (!form.nombre.trim()) { show('Ingresá el nombre.', 'error'); return }
    setGuardando(true)
    try {
      await guardarUsuario(form)
      show('✓ Usuario guardado', 'success')
      setForm(null)
      cargar()
    } catch (err) {
      show('No se pudo guardar: ' + err.message, 'error', 4000)
    }
    setGuardando(false)
  }

  async function toggleActivo(u) {
    try {
      await cambiarActivo(u.cedula, !u.activo)
      cargar()
    } catch (err) {
      show('No se pudo actualizar: ' + err.message, 'error', 4000)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <Link to="/panel" className="text-sm underline" style={{ color: 'var(--color-can-blue)' }}>← Volver al panel</Link>
          <Link to="/panel/auditoria" className="text-sm underline" style={{ color: 'var(--color-can-blue)' }}>Ver auditoría →</Link>
        </div>
        <div className="flex items-center justify-between mt-2 mb-6">
          <h2 className="text-xl font-semibold">Gestión de usuarios</h2>
          <button onClick={abrirNuevo} className="btn btn-primary text-sm">+ Nuevo usuario</button>
        </div>

        {demo && (
          <div className="text-xs rounded-md p-3 mb-4" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            ⚠ Mostrando datos de ejemplo: falta configurar Firebase (ver README) para gestionar usuarios reales.
          </div>
        )}

        {form && (
          <form onSubmit={onSubmit} className="card p-4 mb-5 space-y-3">
            <h3 className="text-sm font-semibold">{items.some((u) => u.cedula === form.cedula) ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label>Cédula</label>
                <input
                  inputMode="numeric"
                  value={form.cedula}
                  disabled={items.some((u) => u.cedula === form.cedula)}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="field">
                <label>Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  {Object.values(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {form.rol === ROLES.INSPECTOR && (
                <div className="field">
                  <label>Equipo de territorio</label>
                  <input value={form.equipo} onChange={(e) => setForm({ ...form, equipo: e.target.value })} placeholder="Ej: Equipo 1" />
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              Usuario activo
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(null)} className="btn btn-outline flex-1">Cancelar</button>
              <button type="submit" disabled={guardando} className="btn btn-primary flex-1">{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
            {!firebaseReady && <p className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠ Modo demo: falta configurar Firebase para que este guardado sea real.</p>}
          </form>
        )}

        {cargando ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Cargando…</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
                  {['Cédula', 'Nombre', 'Rol', 'Equipo', 'Estado', ''].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.cedula} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2">{u.cedula}</td>
                    <td className="px-3 py-2 font-medium">{u.nombre}</td>
                    <td className="px-3 py-2">{u.rol}</td>
                    <td className="px-3 py-2">{u.equipo || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={u.activo !== false ? { background: 'var(--color-success-light)', color: 'var(--color-success)' } : { background: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
                      >
                        {u.activo !== false ? 'Activo' : 'De baja'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => abrirEditar(u)} className="text-xs underline mr-3" style={{ color: 'var(--color-can-blue)' }}>Editar</button>
                      <button onClick={() => toggleActivo(u)} className="text-xs underline" style={{ color: 'var(--color-ink-muted)' }}>
                        {u.activo !== false ? 'Dar de baja' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Toast toast={toast} />
    </div>
  )
}
