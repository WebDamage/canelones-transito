// ═══════════════════════════════════════════════════════════════════
// Configuración de Firebase
// ═══════════════════════════════════════════════════════════════════
// 1. Crea un proyecto en https://console.firebase.google.com
// 2. Activa Authentication (Anónima — se usa solo como transporte interno;
//    el control real es la cédula, ver AuthContext) y Firestore Database.
// 3. En "Configuración del proyecto > Tus apps" copiá el config y pegalo
//    en el archivo .env (ver .env.example) — NO lo hardcodees acá para
//    no subir credenciales al repo público.
//
// Nota: NO se usa Cloud Storage for Firebase ni Cloud Functions a propósito
// (ver src/lib/sync.js y AuthContext.jsx) — ambos exigen pasar el proyecto
// al plan Blaze de Firebase, que pide cargar una tarjeta aunque el uso real
// termine costando $0, y este proyecto corre 100% en el plan gratuito
// Spark. Las fotos/firma viajan como texto dentro del propio documento de
// Firestore en vez de subirse a Storage; el login confía en /usuarios sin
// verificación de servidor en vez de usar Custom Claims (código armado,
// sin activar, en functions/).
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export const app = firebaseReady && !getApps().length ? initializeApp(firebaseConfig) : (getApps()[0] || null)
export const auth = firebaseReady ? getAuth(app) : null
export const db = firebaseReady ? getFirestore(app) : null
