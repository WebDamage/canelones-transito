export function nuevoUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Reduce a máx. 1600px de lado mayor y JPEG 82% — para que el guardado local,
// la sincronización y Firebase Storage no exploten de peso (mismo criterio
// que la app de relevamiento de viviendas del organismo).
export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1600
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
        resolve(c.toDataURL('image/jpeg', 0.82))
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

      resolve(c.toDataURL('image/jpeg', 0.85))
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
