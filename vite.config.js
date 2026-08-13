import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cambia REPO_NAME por el nombre real del repositorio en GitHub
// cuando lo despliegues en GitHub Pages (https://<usuario>.github.io/REPO_NAME/).
// Si el sitio va a vivir en la raiz de un dominio propio, dejalo en '/'.
const REPO_NAME = 'transito-canelones'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
})
