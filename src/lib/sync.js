import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { db, storage, firebaseReady } from './firebase'
import { registrarEvento } from './auditoria'

function dataUrlToStoragePath(uuid, nombre) {
  return `multas/${uuid}/${nombre}`
}

async function subirDataUrl(uuid, nombre, dataUrl) {
  const path = dataUrlToStoragePath(uuid, nombre)
  const sref = ref(storage, path)
  await uploadString(sref, dataUrl, 'data_url')
  return getDownloadURL(sref)
}

/**
 * Sube fotos, video y firma a Storage y escribe el documento de la multa en
 * Firestore. Lanza si algo falla (el llamador decide cómo tratarlo).
 */
export async function sincronizarMulta(multa, { cedulaInspector } = {}) {
  if (!firebaseReady) throw new Error('Firebase no está configurado todavía (ver .env.example).')

  const fotosUrls = []
  for (let i = 0; i < (multa.fotos || []).length; i++) {
    fotosUrls.push(await subirDataUrl(multa.uuid, `foto_${i + 1}.jpg`, multa.fotos[i]))
  }

  let videoUrl = null
  if (multa.video) {
    videoUrl = await subirDataUrl(multa.uuid, 'video.webm', multa.video)
  }

  let firmaUrl = null
  if (multa.firma) {
    firmaUrl = await subirDataUrl(multa.uuid, 'firma.png', multa.firma)
  }

  const payload = {
    uuid: multa.uuid,
    vehiculo: multa.vehiculo,
    infraccion: multa.infraccion,
    infractor: multa.infractor,
    geolocalizacion: multa.geo,
    observaciones: multa.observaciones || '',
    fotosUrls,
    videoUrl,
    firmaUrl,
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
  return { fotosUrls, videoUrl, firmaUrl }
}
