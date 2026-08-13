import { addDoc, collection, getDocs, orderBy, query, limit as fsLimit } from 'firebase/firestore'
import { db, firebaseReady } from './firebase'

// Nota sobre qué tan confiable es este registro: la creación de una multa y
// el cambio de estado se auditan desde acá, del lado del cliente — o sea
// que reflejan lo que el cliente reportó, no algo que el servidor haya
// verificado de forma independiente (a diferencia de los eventos de
// usuarios, que se auditan dentro de las Cloud Functions y sí son
// confiables). Las reglas de Firestore impiden editar o borrar cualquier
// evento ya escrito, así que al menos no se puede alterar el historial
// después del hecho.
export async function registrarEvento(tipo, detalle, actor) {
  if (!firebaseReady) return
  try {
    await addDoc(collection(db, 'auditoria'), {
      tipo,
      detalle,
      actorCedula: actor?.cedula || null,
      actorNombre: actor?.nombre || null,
      creadoEn: new Date().toISOString(),
    })
  } catch (err) {
    // No crítico: que falle el log no debe frenar la acción principal.
    console.warn('No se pudo registrar el evento de auditoría:', err)
  }
}

export async function listarAuditoria(max = 200) {
  if (!firebaseReady) return []
  const q = query(collection(db, 'auditoria'), orderBy('creadoEn', 'desc'), fsLimit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
