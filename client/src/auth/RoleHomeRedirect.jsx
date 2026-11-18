import { Navigate } from 'react-router'
import { useAuth } from './useAuth.js'

// Where "/" leads for each role.
const homeByRole = {
  Customer: '/tickets',
  Agent: '/queue',
  Admin: '/admin/dashboard',
}

// The "/" route: sends each user to their own start page. Always rendered inside ProtectedRoute,
// so a user is signed in here.
export default function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={homeByRole[user.role] ?? '/login'} replace />
}
