import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tiene que ser EXACTAMENTE el nombre del repositorio en GitHub
// (https://<usuario-u-org>.github.io/REPO_NAME/) — si no coincide, todos los
// assets (JS, CSS, el logo) se piden con una ruta base que no existe en el
// sitio publicado, GitHub Pages responde 404 para cada uno, y la app queda
// en blanco aunque el despliegue haya "funcionado" sin errores.
// Si el sitio va a vivir en la raiz de un dominio propio, dejalo en '/'.
const REPO_NAME = 'canelones-transito'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
})
