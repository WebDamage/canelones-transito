import { useMemo, useState } from 'react'
import INFRACCIONES from '../data/infracciones'

const GRAVEDAD_STYLE = {
  'Leve': { background: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  'Grave': { background: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  'Muy Grave': { background: 'var(--color-danger-light)', color: 'var(--color-danger)' },
}

export default function InfraccionPicker({ value, onChange }) {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return INFRACCIONES
    return INFRACCIONES.filter((i) => i.codigo.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q))
  }, [busqueda])

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por código o descripción…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-2"
        style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1.5px solid var(--color-border)', borderRadius: 6 }}
      />

      {value && (
        <div className="rounded-md border p-3 mb-2 flex items-start justify-between gap-2" style={{ borderColor: 'var(--color-can-blue)', background: 'var(--color-page)' }}>
          <div>
            <div className="text-sm font-semibold">{value.codigo} · {value.descripcion}</div>
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1" style={GRAVEDAD_STYLE[value.gravedad]}>{value.gravedad}</span>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-xs underline flex-shrink-0" style={{ color: 'var(--color-ink-muted)' }}>Cambiar</button>
        </div>
      )}

      {!value && (
        <div className="max-h-72 overflow-y-auto rounded-md border divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {filtradas.length === 0 && (
            <p className="text-sm p-3" style={{ color: 'var(--color-ink-muted)' }}>Sin resultados para "{busqueda}".</p>
          )}
          {filtradas.map((i) => (
            <button
              key={i.codigo}
              type="button"
              onClick={() => onChange(i)}
              className="w-full text-left p-3 hover:bg-[var(--color-page)] transition"
            >
              <div className="text-sm font-medium">{i.codigo} · {i.descripcion}</div>
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1" style={GRAVEDAD_STYLE[i.gravedad]}>{i.gravedad}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
