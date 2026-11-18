import { Navigate, Outlet } from 'react-router'
import Spinner from '../components/ui/Spinner.jsx'
import NotAllowedPage from '../features/common/NotAllowedPage.jsx'
import { useAuth } from './useAuth.js'

// Guards a page in the browser: signed-out users go to /login (then to their home page), signed-in
// users without one of `roles` see "Not allowed". This only hides screens; the API still checks
// every request itself, so it is not the real security.
//
// Use it around one element (<ProtectedRoute roles={['Admin']}><Page /></ProtectedRoute>) or as a
// route element with child routes (it then renders them through <Outlet />).
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-blue-600">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <NotAllowedPage />
  }

  return children ?? <Outlet />
}
