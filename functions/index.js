// Cloud Functions — Fase 5.
//
// Esto es lo que cierra la limitación de seguridad señalada desde la Fase 1:
// hasta acá, el "rol" de cada sesión era lo que el cliente decía que era
// (leído de /usuarios, pero sin nada del lado del servidor que lo
// verificara). Estas functions corren con privilegios de administrador,
// validan la cédula contra /usuarios ellas mismas, y graban el rol como
// Custom Claim en el token de Firebase Auth de esa sesión anónima. A partir
// de ahí, firestore.rules puede confiar en request.auth.token.rol porque
// nadie del lado del cliente puede escribir ese campo directamente.
//
// Desplegar con: firebase deploy --only functions (ver README).
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')

initializeApp()
const db = getFirestore()
const auth = getAuth()

const ROLES_VALIDOS = ['Inspector', 'Administrativo', 'Supervisor', 'Administrador']

function limpiarCedula(ci) {
  return String(ci || '').replace(/\D/g, '')
}

async function registrarAuditoria(tipo, detalle, actor) {
  // creadoEn se graba como string ISO (igual que src/lib/auditoria.js del
  // cliente) a propósito: si esto fuera un Firestore Timestamp, quedaría
  // mezclado con los eventos del cliente en la misma colección, y tanto el
  // orderBy('creadoEn') como el .slice(0, 16) de Auditoria.jsx asumen texto.
  await db.collection('auditoria').add({
    tipo,
    detalle,
    actorCedula: actor?.cedula || null,
    actorNombre: actor?.nombre || null,
    creadoEn: new Date().toISOString(),
  })
}

/**
 * Verifica una cédula contra /usuarios y, si es válida y está activa, deja
 * el rol (y equipo) grabados como Custom Claims en el token de la sesión
 * anónima que está llamando. El cliente tiene que refrescar su ID token
 * después de esto para que los claims nuevos surtan efecto.
 */
exports.login = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sesión no autenticada.')
  const cedula = limpiarCedula(request.data?.cedula)
  if (!cedula) throw new HttpsError('invalid-argument', 'Cédula inválida.')

  const snap = await db.collection('usuarios').doc(cedula).get()
  if (!snap.exists) throw new HttpsError('permission-denied', 'Cédula no habilitada.')
  const datos = snap.data()
  if (datos.activo === false) throw new HttpsError('permission-denied', 'Este usuario está dado de baja.')
  if (!ROLES_VALIDOS.includes(datos.rol)) throw new HttpsError('failed-precondition', 'El usuario no tiene un rol válido asignado.')

  await auth.setCustomUserClaims(request.auth.uid, {
    rol: datos.rol,
    cedula,
    equipo: datos.equipo || null,
  })

  return { ok: true, nombre: datos.nombre || '', rol: datos.rol, equipo: datos.equipo || null }
})

/**
 * Alta/edición de un funcionario. Solo Administrador (según el rol grabado
 * en el token del que llama, no en lo que mande en el payload). Escribe con
 * privilegios de administrador, así que las reglas de /usuarios pueden
 * bloquear toda escritura directa desde el cliente.
 */
exports.gestionarUsuario = onCall(async (request) => {
  if (request.auth?.token?.rol !== 'Administrador') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede gestionar usuarios.')
  }
  const { cedula, nombre, rol, equipo, activo } = request.data || {}
  const cedulaLimpia = limpiarCedula(cedula)
  if (!cedulaLimpia || !nombre || !ROLES_VALIDOS.includes(rol)) {
    throw new HttpsError('invalid-argument', 'Datos de usuario incompletos o inválidos.')
  }

  await db.collection('usuarios').doc(cedulaLimpia).set({
    nombre,
    rol,
    equipo: rol === 'Inspector' ? (equipo || null) : null,
    activo: activo !== false,
  }, { merge: true })

  await registrarAuditoria('usuario_guardado', { cedula: cedulaLimpia, rol }, {
    cedula: request.auth.token.cedula,
    nombre: null, // los claims no guardan el nombre, solo rol/cedula/equipo
  })

  return { ok: true }
})

/** Dar de baja / reactivar un funcionario. Mismo control de acceso que arriba. */
exports.cambiarActivoUsuario = onCall(async (request) => {
  if (request.auth?.token?.rol !== 'Administrador') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede gestionar usuarios.')
  }
  const cedula = limpiarCedula(request.data?.cedula)
  const activo = Boolean(request.data?.activo)
  if (!cedula) throw new HttpsError('invalid-argument', 'Cédula inválida.')

  await db.collection('usuarios').doc(cedula).update({ activo })
  await registrarAuditoria('usuario_estado_cambiado', { cedula, activo }, {
    cedula: request.auth.token.cedula,
    nombre: null, // los claims no guardan el nombre, solo rol/cedula/equipo
  })
  return { ok: true }
})
