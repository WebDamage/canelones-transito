import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, firebaseReady } from './firebase'
import { limpiarCedula } from './cedula'
import { ROLES } from '../context/AuthContext'

// Usuarios de muestra para poder ver la pantalla de gestión sin Firebase
// configurado todavía — igual que con las multas, es solo para previsualizar.
const USUARIOS_DEMO = [
  { cedula: '41369542', nombre: 'Administrador', rol: ROLES.ADMINISTRADOR, equipo: null, activo: true },
  { cedula: '22222222', nombre: 'María Rodríguez', rol: ROLES.INSPECTOR, equipo: 'Equipo 1', activo: true },
  { cedula: '33333333', nombre: 'Lucía Fernández', rol: ROLES.INSPECTOR, equipo: 'Equipo 2', activo: true },
  { cedula: '44444444', nombre: 'Carlos Gómez', rol: ROLES.SUPERVISOR, equipo: null, activo: true },
  { cedula: '55555555', nombre: 'Beatriz Núñez', rol: ROLES.ADMINISTRATIVO, equipo: null, activo: false },
]

export async function listarUsuarios() {
  if (!firebaseReady) {
    return { items: USUARIOS_DEMO, demo: true }
  }
  const snap = await getDocs(collection(db, 'usuarios'))
  return { items: snap.docs.map((d) => ({ cedula: d.id, ...d.data() })), demo: false }
}

// Alta/edición y baja/reactivación ya NO escriben directo a Firestore (las
// reglas de la Fase 5 lo bloquean a propósito) — pasan por las Cloud
// Functions gestionarUsuario / cambiarActivoUsuario, que corren con
// privilegios de administrador y verifican que quien llama tenga
// rol === 'Administrador' en su propio token antes de tocar nada.
export async function guardarUsuario({ cedula, nombre, rol, equipo, activo }) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía.')
  const fn = httpsCallable(functions, 'gestionarUsuario')
  await fn({ cedula: limpiarCedula(cedula), nombre, rol, equipo: equipo || null, activo: activo !== false })
}

export async function cambiarActivo(cedula, activo) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía.')
  const fn = httpsCallable(functions, 'cambiarActivoUsuario')
  await fn({ cedula: limpiarCedula(cedula), activo })
}
