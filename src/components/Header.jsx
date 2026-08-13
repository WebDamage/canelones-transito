import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { sesion, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: 'var(--color-border)' }}>
      {/* Franja superior institucional, al estilo imcanelones.gub.uy */}
      <div className="text-white text-xs" style={{ background: 'var(--color-can-blue)' }}>
        <div className="max-w-6xl mx-auto px-4 py-1 flex items-center justify-between">
          <span>Intendencia de Canelones</span>
          <span className="opacity-80">Sistema de Gestión de Infracciones de Tránsito</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}logo-canelones.png`} alt="Gobierno de Canelones" className="h-11 w-11 object-contain" />
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>Tránsito Canelones</h1>
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>Gestión de infracciones</p>
        </div>
        <div className="flex-1" />
        {sesion && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{sesion.nombre || sesion.cedula}</div>
              <div className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{sesion.rol}</div>
            </div>
            <button onClick={logout} className="btn btn-outline text-xs !min-h-0 !py-2">Salir</button>
          </div>
        )}
      </div>
    </header>
  )
}
