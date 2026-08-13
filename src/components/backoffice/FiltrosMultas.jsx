import { useMemo } from 'react'
import { ESTADOS_ADMINISTRATIVOS } from '../../lib/multas'

export default function FiltrosMultas({ items, filtros, onChange }) {
  const inspectores = useMemo(() => {
    const map = new Map()
    items.forEach((m) => { if (m.inspectorCedula) map.set(m.inspectorCedula, m.inspectorNombre || m.inspectorCedula) })
    return [...map.entries()]
  }, [items])

  const equipos = useMemo(() => [...new Set(items.map((m) => m.equipo).filter(Boolean))], [items])
  const codigos = useMemo(() => [...new Set(items.map((m) => m.infraccion?.codigo).filter(Boolean))].sort(), [items])

  function set(campo, valor) {
    onChange({ ...filtros, [campo]: valor })
  }

  return (
    <div className="card p-3 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <div className="field !mb-0">
          <label className="!mb-1">Desde</label>
          <input type="date" value={filtros.desde} onChange={(e) => set('desde', e.target.value)} />
        </div>
        <div className="field !mb-0">
          <label className="!mb-1">Hasta</label>
          <input type="date" value={filtros.hasta} onChange={(e) => set('hasta', e.target.value)} />
        </div>
        <div className="field !mb-0">
          <label className="!mb-1">Inspector</label>
          <select value={filtros.inspector} onChange={(e) => set('inspector', e.target.value)}>
            <option value="">Todos</option>
            {inspectores.map(([ced, nom]) => <option key={ced} value={ced}>{nom}</option>)}
          </select>
        </div>
        <div className="field !mb-0">
          <label className="!mb-1">Equipo</label>
          <select value={filtros.equipo} onChange={(e) => set('equipo', e.target.value)}>
            <option value="">Todos</option>
            {equipos.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
        <div className="field !mb-0">
          <label className="!mb-1">Código</label>
          <select value={filtros.codigo} onChange={(e) => set('codigo', e.target.value)}>
            <option value="">Todos</option>
            {codigos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field !mb-0">
          <label className="!mb-1">Estado</label>
          <select value={filtros.estadoAdministrativo} onChange={(e) => set('estadoAdministrativo', e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS_ADMINISTRATIVOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
