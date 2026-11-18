import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthContext.jsx'
import FetchingBar from './components/ui/FetchingBar.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { router } from './routes.jsx'

// The app's outer wrappers: toasts and the signed-in user are available on every page,
// and the router picks the page for the current URL. FetchingBar shows while any API call runs.
export default function App() {
  return (
    <ToastProvider>
      <FetchingBar />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  )
}
