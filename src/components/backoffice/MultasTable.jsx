const ESTADO_STYLE = {
  'En proceso': { background: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  'Pagada': { background: 'var(--color-success-light)', color: 'var(--color-success)' },
  'Impugnada': { background: 'var(--color-danger-light)', color: 'var(--color-danger)' },
  'Anulada': { background: 'var(--color-border)', color: 'var(--color-ink-muted)' },
}

export default function MultasTable({ items, seleccionada, onSelect }) {
  if (!items.length) {
    return <div className="card p-6 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Ninguna multa coincide con los filtros.</div>
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
              {['Fecha', 'Matrícula', 'Infracción', 'Inspector', 'Estado'].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr
                key={m.uuid}
                onClick={() => onSelect(m)}
                className="cursor-pointer border-b last:border-0 transition"
                style={{
                  borderColor: 'var(--color-border)',
                  background: seleccionada?.uuid === m.uuid ? 'var(--color-page)' : 'transparent',
                }}
              >
                <td className="px-3 py-2 whitespace-nowrap">{(m.creadaEn || '').slice(0, 16).replace('T', ' ')}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{m.vehiculo?.placa || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{m.infraccion?.codigo || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{m.inspectorNombre || m.inspectorCedula || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={ESTADO_STYLE[m.estadoAdministrativo] || ESTADO_STYLE['En proceso']}>
                    {m.estadoAdministrativo || 'En proceso'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
