import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, ROLES } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginScreen from './pages/LoginScreen'
import InspectorHome from './pages/inspector/InspectorHome'
import TicketForm from './pages/inspector/TicketForm'
import Dashboard from './pages/backoffice/Dashboard'
import Usuarios from './pages/backoffice/Usuarios'
import MapaEnVivo from './pages/backoffice/MapaEnVivo'
import Boleta from './pages/backoffice/Boleta'
import Auditoria from './pages/backoffice/Auditoria'

function Home() {
  const { sesion } = useAuth()
  if (!sesion) return <Navigate to="/login" replace />
  if (sesion.rol === ROLES.INSPECTOR) return <Navigate to="/inspector" replace />
  return <Navigate to="/panel" replace />
}

export default function App() {
  return (
    <AuthProvider>
      {/* HashRouter: evita configurar reglas de rewrite en GitHub Pages */}
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/inspector"
            element={
              <ProtectedRoute roles={[ROLES.INSPECTOR]}>
                <InspectorHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspector/nueva"
            element={
              <ProtectedRoute roles={[ROLES.INSPECTOR]}>
                <TicketForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel"
            element={
              <ProtectedRoute roles={[ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.ADMINISTRATIVO]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/usuarios"
            element={
              <ProtectedRoute roles={[ROLES.ADMINISTRADOR]}>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/mapa"
            element={
              <ProtectedRoute roles={[ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.ADMINISTRATIVO]}>
                <MapaEnVivo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/boleta/:uuid"
            element={
              <ProtectedRoute roles={[ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.ADMINISTRATIVO]}>
                <Boleta />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/auditoria"
            element={
              <ProtectedRoute roles={[ROLES.ADMINISTRADOR]}>
                <Auditoria />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
