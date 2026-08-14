export function nuevoUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Reduce a máx. 1100px de lado mayor y JPEG 65% — más agresivo que un simple
// "achicar la foto": como no se usa Cloud Storage for Firebase (pide plan
// Blaze incluso para uso gratuito, ver sync.js), las fotos viajan como
// string dentro del propio documento de Firestore, que tiene un límite duro
// de 1 MiB por documento. Con esta compresión, unas 4-5 fotos entran
// cómodas; igual hay un control de presupuesto total en CameraCapture.jsx y
// sync.js por si el contenido de la foto (mucho detalle) la deja pesada.
export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1100
        let w = img.width
        let h = img.height
        if (Math.max(w, h) > MAX) {
          const k = MAX / Math.max(w, h)
          w = Math.round(w * k)
          h = Math.round(h * k)
        }
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.65))
      }
      img.onerror = () => resolve(e.target.result)
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// Estampa fecha/hora (y la matrícula, si ya se cargó) sobre la foto. Se hace
// del lado del cliente con canvas, no confiando en el EXIF: muchos
// navegadores lo descartan al recomprimir, y esto deja constancia visible
// sin importar por dónde termine viéndose la foto (panel, boleta impresa, etc.).
export function watermarkDataUrl(dataUrl, lines) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const fontSize = Math.max(14, Math.round(img.width * 0.03))
      const padX = Math.round(fontSize * 0.6)
      const lineH = Math.round(fontSize * 1.3)
      const barH = lines.length * lineH + padX

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.fillRect(0, img.height - barH, img.width, barH)

      ctx.fillStyle = '#ffffff'
      ctx.font = `${fontSize}px sans-serif`
      ctx.textBaseline = 'top'
      lines.forEach((line, i) => {
        ctx.fillText(line, padX, img.height - barH + padX / 2 + i * lineH)
      })

      resolve(c.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function dataUrlSizeMB(dataUrl) {
  if (!dataUrl) return 0
  const base64 = dataUrl.split(',')[1] || ''
  return (base64.length * 0.75) / (1024 * 1024)
}

// Cuánto pueden pesar, en total, las fotos + firma de una boleta antes de
// arriesgarse a pisar el límite de 1 MiB por documento de Firestore (se deja
// margen para el resto de los campos y para el overhead de Firestore).
export const PRESUPUESTO_EVIDENCIA_MB = 0.85
