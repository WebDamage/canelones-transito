import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { signInAnonymously, signOut } from 'firebase/auth'
import { auth, db, firebaseReady } from '../lib/firebase'
import { limpiarCedula } from '../lib/cedula'

const SESSION_KEY = 'transitoCanelonesSesion'
const ADMIN_CEDULA_SEED = '41369542'

export const ROLES = {
  INSPECTOR: 'Inspector',
  ADMINISTRATIVO: 'Administrativo',
  SUPERVISOR: 'Supervisor',
  ADMINISTRADOR: 'Administrador',
}
const ROLES_VALIDOS = Object.values(ROLES)

const AuthContext = createContext(null)

// Login solo por cédula, sin verificación de servidor: lee /usuarios y
// confía en lo que dice el documento. Es la limitación de seguridad conocida
// del proyecto (ver README) — la alternativa (Custom Claims vía Cloud
// Functions, ver functions/index.js) requiere el plan Blaze de Firebase, que
// pide tarjeta, y por decisión explícita este prototipo corre sin eso.
async function verificarCedula(cedula) {
  if (!auth.currentUser) await signInAnonymously(auth)
  const snap = await getDoc(doc(db, 'usuarios', cedula))
  if (!snap.exists()) {
    const err = new Error('Cédula no habilitada.')
    err.code = 'permission-denied'
    throw err
  }
  const datos = snap.data()
  if (datos.activo === false) {
    const err = new Error('Usuario dado de baja.')
    err.code = 'permission-denied'
    throw err
  }
  if (!ROLES_VALIDOS.includes(datos.rol)) {
    const err = new Error('Rol inválido.')
    err.code = 'failed-precondition'
    throw err
  }
  return datos
}

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
        // Se vuelve a verificar contra /usuarios en cada carga de página
        // (en vez de confiar ciegamente en lo guardado en localStorage) para
        // que una baja o un cambio de rol entre sesiones se refleje pronto.
        try {
          const datos = await verificarCedula(guardada.cedula)
          guardada = { ...guardada, nombre: datos.nombre || '', rol: datos.rol, equipo: datos.equipo || null }
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
      const datos = await verificarCedula(cedula)
      const s = { cedula, nombre: datos.nombre || '', rol: datos.rol, equipo: datos.equipo || null }
      localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      setSesion(s)
      return { ok: true }
    } catch (err) {
      const mensaje = {
        'permission-denied': 'Cédula no habilitada o dada de baja.',
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
