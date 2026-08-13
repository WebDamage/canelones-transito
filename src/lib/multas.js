import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore'
import { db, firebaseReady } from './firebase'
import MULTAS_DEMO from '../data/multasDemo'
import { registrarEvento } from './auditoria'

export const ESTADOS_ADMINISTRATIVOS = ['En proceso', 'Pagada', 'Impugnada', 'Anulada']

/**
 * Trae todas las multas. Se filtra del lado del cliente (ver aplicarFiltros)
 * en vez de armar queries compuestas en Firestore — más simple de mantener
 * mientras el volumen sea el de un piloto; si el organismo crece a muchos
 * miles de boletas, esto conviene pasarlo a paginado + índices server-side.
 */
export async function listarMultas() {
  if (!firebaseReady) {
    return { items: MULTAS_DEMO, demo: true }
  }
  const q = query(collection(db, 'multas'), orderBy('creadaEn', 'desc'))
  const snap = await getDocs(q)
  return { items: snap.docs.map((d) => d.data()), demo: false }
}

export async function actualizarEstadoAdministrativo(uuid, estadoAdministrativo, actor) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía.')
  await updateDoc(doc(db, 'multas', uuid), { estadoAdministrativo })
  await registrarEvento('multa_estado_cambiado', { uuid, nuevoEstado: estadoAdministrativo }, actor)
}

export function aplicarFiltros(items, filtros) {
  return items.filter((m) => {
    if (filtros.desde && m.creadaEn < filtros.desde) return false
    if (filtros.hasta && m.creadaEn > filtros.hasta + 'T23:59:59') return false
    if (filtros.inspector && m.inspectorCedula !== filtros.inspector) return false
    if (filtros.equipo && m.equipo !== filtros.equipo) return false
    if (filtros.codigo && m.infraccion?.codigo !== filtros.codigo) return false
    if (filtros.estadoAdministrativo && m.estadoAdministrativo !== filtros.estadoAdministrativo) return false
    return true
  })
}

export function calcularMetricas(items) {
  const hoy = new Date().toISOString().slice(0, 10)
  const inicioMes = new Date().toISOString().slice(0, 7)
  return {
    hoy: items.filter((m) => (m.creadaEn || '').startsWith(hoy)).length,
    mes: items.filter((m) => (m.creadaEn || '').startsWith(inicioMes)).length,
    total: items.length,
    equipos: new Set(items.map((m) => m.equipo).filter(Boolean)).size,
  }
}
