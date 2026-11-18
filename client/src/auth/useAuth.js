import { createContext, useContext } from 'react'

// Shared by AuthContext.jsx (which provides it) and every component that needs the current user.
// Kept in its own file so AuthContext.jsx exports only components (needed for Vite's fast refresh).
export const AuthContext = createContext(null)

// const { user, loading, login, logout, refresh } = useAuth()
// user is null when signed out; loading is true until the first /auth/me answer arrives.
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
