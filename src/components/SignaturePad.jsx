import { useEffect, useRef, useState } from 'react'

/**
 * Canvas de firma táctil/mouse. Expone la firma como dataURL vía onChange.
 * `value` permite restaurar una firma guardada (borrador recuperado).
 */
export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const [hasData, setHasData] = useState(Boolean(value))

  useEffect(() => {
    const canvas = canvasRef.current
    ctxRef.current = canvas.getContext('2d')
    function resize() {
      const w = canvas.offsetWidth
      const prev = hasData ? canvas.toDataURL() : null
      canvas.width = w
      canvas.height = 180
      if (prev) {
        const img = new Image()
        img.onload = () => ctxRef.current.drawImage(img, 0, 0)
        img.src = prev
      } else if (value) {
        const img = new Image()
        img.onload = () => {
          ctxRef.current.drawImage(img, 0, 0, canvas.width, canvas.height)
          setHasData(true)
        }
        img.src = value
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pos(e) {
    const canvas = canvasRef.current
    const r = canvas.getBoundingClientRect()
    const sx = canvas.width / r.width
    const sy = canvas.height / r.height
    if (e.touches) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy }
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
  }

  function start(e) {
    drawingRef.current = true
    lastRef.current = pos(e)
  }
  function move(e) {
    if (!drawingRef.current) return
    if (e.touches) e.preventDefault()
    const p = pos(e)
    const ctx = ctxRef.current
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#1c1f24'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
    lastRef.current = p
    setHasData(true)
  }
  function end() {
    if (!drawingRef.current) return
    drawingRef.current = false
    onChange(canvasRef.current.toDataURL('image/png'))
  }
  function clear() {
    const canvas = canvasRef.current
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height)
    setHasData(false)
    onChange('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-md border touch-none"
        style={{ borderColor: 'var(--color-border)', background: '#fff', height: 180 }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center gap-3 mt-2">
        <button type="button" onClick={clear} className="btn btn-outline text-xs !min-h-0 !py-2">Borrar firma</button>
        {hasData && <span className="text-xs" style={{ color: 'var(--color-success)' }}>✓ Firma registrada</span>}
      </div>
    </div>
  )
}
