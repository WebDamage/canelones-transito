import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protege una ruta según la sesión activa y, opcionalmente, los roles permitidos.
 * Uso: <ProtectedRoute roles={[ROLES.ADMINISTRADOR]}><Panel /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { sesion, cargando } = useAuth()

  if (cargando) return null
  if (!sesion) return <Navigate to="/login" replace />
  if (roles && !roles.includes(sesion.rol)) return <Navigate to="/" replace />
  return children
}
