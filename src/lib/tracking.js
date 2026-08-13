import { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { db, firebaseReady } from './firebase'

// Un inspector se considera "activo" en el mapa si su última ubicación se
// actualizó hace menos de esto. Pasado ese tiempo, el panel lo trata como
// desconectado aunque el documento siga en Firestore.
export const ACTIVO_UMBRAL_MIN = 5
const ENVIO_INTERVALO_MS = 45000 // 45s — dentro del rango "30-60s" pedido

let watchId = null
let intervalId = null
let ultimaPos = null

/**
 * Empieza a compartir la ubicación del inspector. Es una acción explícita
 * (toggle en la pantalla del inspector, ver InspectorHome) — no arranca sola
 * en segundo plano. El seguimiento continuo de la ubicación de funcionarios
 * tiene implicancias laborales que exceden lo técnico; que sea opt-in es una
 * mitigación razonable, pero si el organismo decide que debe ser obligatorio
 * (o, al revés, que ni siquiera debería ofrecerse así), es una decisión de
 * política que el equipo del proyecto tiene que validar, no algo que se
 * resuelve solo en el código.
 */
export function iniciarSeguimiento(sesion, onError) {
  if (!navigator.geolocation) { onError?.('Geolocalización no disponible en este navegador.'); return }

  function capturar() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ultimaPos = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }
        enviar()
      },
      (err) => onError?.(err.code === 1 ? 'Permiso de ubicación denegado.' : 'No se pudo obtener la ubicación.'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  function enviar() {
    if (!ultimaPos || !firebaseReady) return
    setDoc(doc(db, 'ubicaciones', sesion.cedula), {
      cedula: sesion.cedula,
      nombre: sesion.nombre || sesion.cedula,
      equipo: sesion.equipo || null,
      lat: ultimaPos.lat,
      lon: ultimaPos.lon,
      acc: ultimaPos.acc,
      actualizadoEn: serverTimestamp(),
    }).catch(() => {})
  }

  capturar()
  intervalId = setInterval(capturar, ENVIO_INTERVALO_MS)
}

export function estaCompartiendoUbicacion() {
  return intervalId != null
}

export async function detenerSeguimiento(cedula) {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null }
  if (intervalId != null) { clearInterval(intervalId); intervalId = null }
  ultimaPos = null
  if (firebaseReady && cedula) {
    try { await deleteDoc(doc(db, 'ubicaciones', cedula)) } catch (e) { /* no crítico */ }
  }
}

export async function listarUbicacionesActivas() {
  if (!firebaseReady) return []
  const snap = await getDocs(collection(db, 'ubicaciones'))
  const ahora = Date.now()
  return snap.docs
    .map((d) => d.data())
    .filter((u) => {
      const ts = u.actualizadoEn?.toMillis ? u.actualizadoEn.toMillis() : 0
      return ahora - ts < ACTIVO_UMBRAL_MIN * 60000
    })
}
