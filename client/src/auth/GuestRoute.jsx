import { Navigate } from 'react-router'
import Spinner from '../components/ui/Spinner.jsx'
import { useAuth } from './useAuth.js'

// The opposite of ProtectedRoute, for /login, /register, /forgot-password: a signed-in user is always
// sent to the home page "/", which RoleHomeRedirect turns into My tickets / My queue / Dashboard.
// While the app is still asking the API who is signed in, show a spinner instead of the form.
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-indigo-600">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  return children
}
