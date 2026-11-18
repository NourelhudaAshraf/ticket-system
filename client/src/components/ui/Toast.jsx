import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './useToast.js'

const tones = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
}

// Wrap the app once in <ToastProvider>. Any component can then call useToast() to show a short
// message in the top-right corner; each one disappears after 5 seconds or when closed.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((current) => current.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (message, tone) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )

  // useMemo keeps the same object between renders, so components using the toast don't re-render.
  const toast = useMemo(
    () => ({ error: (message) => show(message, 'error'), success: (message) => show(message, 'success') }),
    [show],
  )

  return (
    <ToastContext value={toast}>
      {children}
      <div aria-live="polite" className="fixed inset-x-4 top-4 z-50 space-y-2 md:left-auto md:right-6 md:top-6 md:w-96">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm shadow-lg ${tones[t.tone]}`}>
            <p>{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-my-3 -mr-2 inline-flex size-11 shrink-0 items-center justify-center">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
