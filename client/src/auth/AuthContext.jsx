import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth.js'
import { AuthContext } from './useAuth.js'

// Holds "who is signed in" for the whole app (like a small global store). On start it asks the API
// (GET /auth/me) — the sign-in cookie is HttpOnly, so JavaScript cannot read it and must ask.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Once on start: ask who is signed in. A 401 just means nobody is. State is only set inside the
  // promise callbacks (when the answer arrives), as React's lint rules expect for effects.
  useEffect(() => {
    authApi
      .me()
      .then(setUser, () => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Re-reads the current user, e.g. after verifying an email or changing a name.
  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me())
    } catch {
      setUser(null)
    }
  }, [])

  // Throws the API error (e.g. invalid_credentials) so the login form can show it.
  const login = useCallback(async (email, password) => {
    const signedIn = await authApi.login(email, password)
    setUser(signedIn)
    return signedIn
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null) // signed out locally even if the cookie had already expired
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh])

  return <AuthContext value={value}>{children}</AuthContext>
}
