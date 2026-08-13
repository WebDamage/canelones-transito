import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { signInAnonymously, signOut } from 'firebase/auth'
import { auth, functions, firebaseReady } from '../lib/firebase'
import { limpiarCedula } from '../lib/cedula'

const SESSION_KEY = 'transitoCanelonesSesion'
const ADMIN_CEDULA_SEED = '41369542'

export const ROLES = {
  INSPECTOR: 'Inspector',
  ADMINISTRATIVO: 'Administrativo',
  SUPERVISOR: 'Supervisor',
  ADMINISTRADOR: 'Administrador',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    async function restaurar() {
      let guardada = null
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) guardada = JSON.parse(raw)
      } catch (e) { /* sin sesión previa */ }

      if (guardada && firebaseReady && !guardada.demo) {
        // Volver a llamar a login() en cada carga de página (en vez de
        // confiar en que el usuario anónimo y sus Custom Claims siguieron
        // "vivos" entre recargas) es un poco más de tráfico, pero es lo que
        // garantiza que el rol quede bien asignado sin importar cómo se
        // comporte la persistencia de Firebase Auth en cada navegador —
        // login() es idempotente y barata (una lectura a /usuarios).
        try {
          if (!auth.currentUser) await signInAnonymously(auth)
          const llamarLogin = httpsCallable(functions, 'login')
          const resultado = await llamarLogin({ cedula: guardada.cedula })
          await auth.currentUser.getIdToken(true)
          guardada = { ...guardada, nombre: resultado.data.nombre, rol: resultado.data.rol, equipo: resultado.data.equipo || null }
          localStorage.setItem(SESSION_KEY, JSON.stringify(guardada))
        } catch (err) {
          // La cédula pudo haber sido dada de baja entre sesiones.
          localStorage.removeItem(SESSION_KEY)
          guardada = null
        }
      }

      if (!cancelado) {
        setSesion(guardada)
        setCargando(false)
      }
    }
    restaurar()
    return () => { cancelado = true }
  }, [])

  const login = useCallback(async (cedulaInput) => {
    const cedula = limpiarCedula(cedulaInput)

    if (!firebaseReady) {
      // Modo demo: sin proyecto Firebase configurado todavía.
      // Permite recorrer la app; solo la cédula admin de referencia funciona.
      if (cedula === ADMIN_CEDULA_SEED) {
        const demo = { cedula, nombre: 'Administrador (demo)', rol: ROLES.ADMINISTRADOR, demo: true }
        localStorage.setItem(SESSION_KEY, JSON.stringify(demo))
        setSesion(demo)
        return { ok: true }
      }
      return { ok: false, error: 'Falta configurar Firebase (ver .env.example). Por ahora solo funciona la cédula admin de referencia.' }
    }

    try {
      if (!auth.currentUser) await signInAnonymously(auth)
      // La verificación de la cédula y la asignación del rol pasan por la
      // Cloud Function login() — corre con privilegios de administrador y
      // es la única que puede grabar Custom Claims en el token de esta
      // sesión. El cliente nunca decide su propio rol.
      const llamarLogin = httpsCallable(functions, 'login')
      const resultado = await llamarLogin({ cedula })
      const { nombre, rol, equipo } = resultado.data

      // Sin esto, el ID token en caché del cliente seguiría sin los claims
      // recién asignados hasta que expire solo (hasta 1 hora).
      await auth.currentUser.getIdToken(true)

      const s = { cedula, nombre: nombre || '', rol, equipo: equipo || null }
      localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      setSesion(s)
      return { ok: true }
    } catch (err) {
      const mensaje = {
        'permission-denied': 'Cédula no habilitada o dada de baja.',
        'invalid-argument': 'La cédula no es válida.',
        'failed-precondition': 'El usuario no tiene un rol válido asignado. Contactá a un administrador.',
      }[err.code] || 'No se pudo verificar la cédula. Revisá la conexión.'
      return { ok: false, error: mensaje }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSesion(null)
    if (firebaseReady && auth.currentUser) signOut(auth).catch(() => {})
  }, [])

  return (
    <AuthContext.Provider value={{ sesion, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
