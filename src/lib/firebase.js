// ═══════════════════════════════════════════════════════════════════
// Configuración de Firebase
// ═══════════════════════════════════════════════════════════════════
// 1. Crea un proyecto en https://console.firebase.google.com
// 2. Activa Authentication (Anónima o Email/Password — se usa solo como
//    transporte interno; el control real es la cédula, ver AuthContext),
//    Firestore Database y Storage.
// 3. En "Configuración del proyecto > Tus apps" copiá el config y pegalo
//    en el archivo .env (ver .env.example) — NO lo hardcodees acá para
//    no subir credenciales al repo público.
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

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
export const storage = firebaseReady ? getStorage(app) : null
export const functions = firebaseReady ? getFunctions(app) : null
