import { useRef } from 'react'
import { compressImage, fileToDataUrl, dataUrlSizeMB, watermarkDataUrl } from '../lib/media'

const MIN_FOTOS_RECOMENDADO = 3

/**
 * Captura de fotos (múltiples, comprimidas a JPEG y con marca de agua de
 * fecha/hora) y un video corto opcional, usando la cámara nativa del
 * dispositivo vía <input capture>. Se eligió este enfoque (en vez de una
 * preview en vivo con getUserMedia) porque funciona de forma más pareja
 * entre Android/iOS dentro de una PWA y no requiere manejar permisos de
 * cámara en pantalla completa a mano.
 */
export default function CameraCapture({ fotos, onFotosChange, video, onVideoChange, placa }) {
  const fotoInputRef = useRef(null)
  const videoInputRef = useRef(null)

  async function handleFotos(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const nuevas = []
    for (const f of files) {
      const comprimida = await compressImage(f)
      // La matrícula se estampa solo si ya se cargó al momento de sacar la
      // foto (en el formulario se pide antes, pero nada obliga el orden);
      // si todavía no está, se estampa solo fecha/hora.
      const lineas = [new Date().toLocaleString('es-UY')]
      lineas.push(placa ? `Matrícula: ${placa}` : 'Intendencia de Canelones · Tránsito')
      nuevas.push(await watermarkDataUrl(comprimida, lineas))
    }
    onFotosChange([...fotos, ...nuevas])
    e.target.value = ''
  }

  async function handleVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      alert('El video pesa más de 25MB. Grabá uno más corto (máx. ~30 segundos).')
      e.target.value = ''
      return
    }
    const dataUrl = await fileToDataUrl(file)
    onVideoChange(dataUrl)
    e.target.value = ''
  }

  function quitarFoto(i) {
    onFotosChange(fotos.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-ink-soft)' }}>
          Fotos del vehículo y la escena
        </label>
        <span className="text-xs" style={{ color: fotos.length >= MIN_FOTOS_RECOMENDADO ? 'var(--color-success)' : 'var(--color-warning)' }}>
          {fotos.length} foto(s) {fotos.length < MIN_FOTOS_RECOMENDADO && `· se recomiendan al menos ${MIN_FOTOS_RECOMENDADO}`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {fotos.map((src, i) => (
          <div key={i} className="relative aspect-square rounded-md overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => quitarFoto(i)}
              aria-label="Eliminar foto"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fotoInputRef.current?.click()}
          className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          Agregar
        </button>
      </div>
      <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFotos} />

      <div className="flex items-center justify-between mb-2 mt-4">
        <label className="text-sm font-medium" style={{ color: 'var(--color-ink-soft)' }}>Video (opcional, máx. ~30s)</label>
      </div>
      {video ? (
        <div className="flex items-center gap-3">
          <video src={video} controls className="w-32 rounded-md border" style={{ borderColor: 'var(--color-border)' }} />
          <button type="button" onClick={() => onVideoChange('')} className="btn btn-outline text-xs !min-h-0 !py-2">Quitar video</button>
          {dataUrlSizeMB(video) > 8 && (
            <span className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠ Pesa {dataUrlSizeMB(video).toFixed(1)}MB, puede tardar al sincronizar</span>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => videoInputRef.current?.click()} className="btn btn-outline text-xs">
          🎥 Grabar video
        </button>
      )}
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideo} />
    </div>
  )
}
