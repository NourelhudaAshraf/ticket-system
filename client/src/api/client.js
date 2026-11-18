import axios from 'axios'
import * as fetching from './fetchingStore.js'

// One axios instance for the whole app. Every request goes to VITE_API_BASE_URL from client/.env
// ("/api/v1", which Vite forwards to the API in development) and sends the sign-in cookie along.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
})

// These calls are allowed to answer 401 without sending the user to the login page:
// /auth/me asks "am I signed in?", /auth/login reports a wrong password, /auth/logout may run
// after the cookie already expired.
const NO_LOGIN_REDIRECT = ['/auth/me', '/auth/login', '/auth/logout']

// Count running requests for the top loading bar (FetchingBar.jsx).
client.interceptors.request.use((config) => {
  fetching.start()
  return config
})
client.interceptors.response.use(
  (response) => {
    fetching.done()
    return response
  },
  (error) => {
    fetching.done()
    return Promise.reject(error)
  },
)

// Every failed request ends here. It turns the API's { code, message, ... } body into one plain
// error object, so pages can always read error.message, error.code, and error.errors.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data ?? {}

    const apiError = {
      status,
      code: body.code ?? (status ? 'server_error' : 'network_error'),
      message:
        body.message ??
        (status ? 'Something went wrong. Please try again.' : 'Cannot reach the server. Check your connection.'),
      errors: body.errors ?? {}, // field errors: { email: ["..."] }
      allowedNext: body.allowedNext ?? [], // only on invalid_transition
    }

    // Session expired or never signed in: go to the login page (then the home page after sign-in).
    const url = error.config?.url ?? ''
    if (status === 401 && !NO_LOGIN_REDIRECT.some((path) => url.startsWith(path)) && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }

    return Promise.reject(apiError)
  },
)

export default client
