import client from './client.js'

// One function per auth endpoint. Each returns the response body (or nothing), so callers never
// deal with axios responses directly. Errors arrive as the { status, code, message, errors } object
// built in client.js.

// Creates a Customer account and emails a verification link. Does not sign in.
export const register = ({ name, email, password }) =>
  client.post('/auth/register', { name, email, password }).then((r) => r.data)

export const verifyEmail = ({ userId, token }) => client.post('/auth/verify-email', { userId, token })

// Always succeeds (the API never says whether the email exists).
export const resendVerification = (email) => client.post('/auth/resend-verification', { email })

export const login =(email, password) => client.post('/auth/login', { email, password }).then((r) => r.data)

export const logout = () => client.post('/auth/logout')

// The signed-in user, or a 401 error when nobody is signed in.
export const me = () => client.get('/auth/me').then((r) => r.data)

export const forgotPassword = (email) => client.post('/auth/forgot-password', { email })

export const resetPassword = ({ userId, token, newPassword }) =>
  client.post('/auth/reset-password', { userId, token, newPassword })
