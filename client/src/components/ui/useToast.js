import { createContext, useContext } from 'react'

// Shared by Toast.jsx (which provides it) and any component that shows a message.
// Kept in its own file so Toast.jsx exports only components (needed for Vite's fast refresh).
export const ToastContext = createContext(null)

// const toast = useToast(); toast.error('Could not save'); toast.success('Saved')
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
