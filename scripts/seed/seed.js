// Carga el catálogo de infracciones y el usuario administrador inicial en Firestore.
//
// Uso:
//   1. Generá una clave de cuenta de servicio: Firebase Console >
//      Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.
//   2. Guardala como scripts/seed/serviceAccountKey.json (está en .gitignore, no se sube).
//   3. npm install firebase-admin --save-dev
//   4. node scripts/seed/seed.js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf-8'))
const infracciones = JSON.parse(readFileSync(join(__dirname, 'infracciones.json'), 'utf-8'))
const usuarios = JSON.parse(readFileSync(join(__dirname, 'usuarios.json'), 'utf-8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function run() {
  const batch = db.batch()

  infracciones.forEach((inf) => {
    const ref = db.collection('infracciones').doc(inf.codigo)
    batch.set(ref, inf)
  })

  Object.entries(usuarios).forEach(([cedula, datos]) => {
    const ref = db.collection('usuarios').doc(cedula)
    batch.set(ref, datos)
  })

  await batch.commit()
  console.log(`Listo: ${infracciones.length} infracciones y ${Object.keys(usuarios).length} usuario(s) cargados.`)
}

run().catch((err) => {
  console.error('Error al cargar datos:', err)
  process.exit(1)
})
