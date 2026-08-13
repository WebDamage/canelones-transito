import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { validarCedulaUY } from '../lib/cedula'
import { useAuth } from '../context/AuthContext'
import { firebaseReady } from '../lib/firebase'

export default function LoginScreen() {
  const { sesion, login } = useAuth()
  const [cedula, setCedula] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Ya hay sesión activa (por ej. se volvió a "/login" a mano): no mostrar el form de nuevo.
  if (sesion) return <Navigate to="/" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validarCedulaUY(cedula)) {
      setError('La cédula no es válida. Revisá el número.')
      return
    }
    setEnviando(true)
    const r = await login(cedula)
    setEnviando(false)
    if (!r.ok) setError(r.error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, var(--color-can-blue) 0%, var(--color-can-blue-dark) 100%)' }}>
      <div className="card w-full max-w-sm p-8 text-center">
        <img src={`${import.meta.env.BASE_URL}logo-canelones.png`} alt="Gobierno de Canelones" className="h-20 w-20 object-contain mx-auto mb-3" />
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>Tránsito Canelones</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-muted)' }}>Ingresá con tu cédula de funcionario</p>

        {!firebaseReady && (
          <div className="text-xs text-left rounded-md p-3 mb-4" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            ⚠ Modo demo: falta configurar Firebase (ver .env.example). Solo la cédula admin de referencia (41.369.542) funciona por ahora.
          </div>
        )}

        <form onSubmit={onSubmit} className="field text-left">
          <label htmlFor="cedula">Cédula de identidad</label>
          <input
            id="cedula"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej: 1.234.567-8"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
          />
          {error && <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button type="submit" name="submit" disabled={enviando} className="btn btn-primary w-full mt-5">
            {enviando ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
