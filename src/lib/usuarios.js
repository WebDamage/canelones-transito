import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db, firebaseReady } from './firebase'
import { limpiarCedula } from './cedula'
import { ROLES } from '../context/AuthContext'
import { registrarEvento } from './auditoria'

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

// Alta/edición y baja/reactivación escriben directo a Firestore. Las reglas
// (ver firestore.rules) solo piden estar autenticado — sin Custom Claims no
// se puede exigir "solo Administrador" del lado del servidor, así que ese
// control queda a cargo de la interfaz (esta pantalla solo es accesible para
// el rol Administrador, ver App.jsx). Es la limitación de seguridad conocida
// del proyecto, documentada en el README: para cerrarla del todo hace falta
// pasar a Cloud Functions + Custom Claims (ya armado en functions/, pero
// requiere plan Blaze de Firebase).
export async function guardarUsuario({ cedula, nombre, rol, equipo, activo }, actor) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía.')
  const cedulaLimpia = limpiarCedula(cedula)
  await setDoc(doc(db, 'usuarios', cedulaLimpia), {
    nombre,
    rol,
    equipo: rol === ROLES.INSPECTOR ? (equipo || null) : null,
    activo: activo !== false,
  }, { merge: true })
  await registrarEvento('usuario_guardado', { cedula: cedulaLimpia, rol }, actor)
}

export async function cambiarActivo(cedula, activo, actor) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía.')
  const cedulaLimpia = limpiarCedula(cedula)
  await updateDoc(doc(db, 'usuarios', cedulaLimpia), { activo })
  await registrarEvento('usuario_estado_cambiado', { cedula: cedulaLimpia, activo }, actor)
}
