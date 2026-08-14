import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, firebaseReady } from './firebase'
import { registrarEvento } from './auditoria'
import { dataUrlSizeMB, PRESUPUESTO_EVIDENCIA_MB } from './media'

/**
 * Escribe el documento de la multa directo en Firestore — las fotos y la
 * firma van adentro del propio documento como strings data:URL, sin pasar
 * por Cloud Storage for Firebase. Es una decisión a propósito, no un
 * descuido: desde 2024 Google exige pasar el proyecto al plan Blaze (pide
 * tarjeta) para poder crear el bucket de Storage, incluso para uso 100%
 * gratuito, y este proyecto corre sin tarjeta. El video NO se sincroniza —
 * pesa demasiado para el límite de 1 MiB por documento de Firestore, así
 * que queda solo en el dispositivo que lo grabó (ver CameraCapture.jsx).
 *
 * Lanza si algo falla (el llamador decide cómo tratarlo).
 */
export async function sincronizarMulta(multa, { cedulaInspector } = {}) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía (ver .env.example).')

  const pesoFotos = (multa.fotos || []).reduce((acc, f) => acc + dataUrlSizeMB(f), 0)
  const pesoFirma = dataUrlSizeMB(multa.firma)
  if (pesoFotos + pesoFirma > PRESUPUESTO_EVIDENCIA_MB) {
    // No debería pasar casi nunca: CameraCapture.jsx ya frena esto al
    // agregar fotos. Queda como resguardo por si una boleta vieja (guardada
    // antes de este límite) intenta sincronizar.
    throw new Error('Las fotos de esta boleta pesan demasiado para guardar en la base de datos gratuita. Sacá alguna foto e intentá de nuevo.')
  }

  const payload = {
    uuid: multa.uuid,
    vehiculo: multa.vehiculo,
    infraccion: multa.infraccion,
    infractor: multa.infractor,
    geolocalizacion: multa.geo,
    observaciones: multa.observaciones || '',
    fotosUrls: multa.fotos || [],
    videoUrl: null,
    firmaUrl: multa.firma || null,
    inspectorCedula: cedulaInspector || multa.inspectorCedula || null,
    equipo: multa.equipo || null,
    estado: 'sincronizada',
    estadoAdministrativo: 'En proceso',
    creadaEn: multa.guardadoEn || new Date().toISOString(),
    sincronizadaEn: serverTimestamp(),
  }

  await setDoc(doc(collection(db, 'multas'), multa.uuid), payload)
  await registrarEvento(
    'multa_creada',
    { uuid: multa.uuid, placa: multa.vehiculo?.placa, codigo: multa.infraccion?.codigo },
    { cedula: payload.inspectorCedula, nombre: multa.inspectorNombre },
  )
  return { fotosUrls: payload.fotosUrls, videoUrl: null, firmaUrl: payload.firmaUrl }
}
