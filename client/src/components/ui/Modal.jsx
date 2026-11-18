import { useEffect, useId, useRef } from 'react'

// A dialog built on the browser's own <dialog> element: showModal() keeps keyboard focus inside the
// dialog and closes it on Esc, so no extra code is needed for that. Full screen on phones, a centered
// box from md (48rem). `open` controls it; `onClose` runs on Esc, the ✕ button, or closing from code.
export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 text-gray-900 backdrop:bg-slate-900/50 backdrop:backdrop-blur-[0.25rem] md:m-auto md:h-auto md:max-h-[85dvh] md:max-w-lg md:rounded-2xl md:shadow-2xl"
    >
      <div className="flex h-full flex-col md:max-h-[85dvh]">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-2.5">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 md:flex-row md:justify-end">{footer}</footer>
        )}
      </div>
    </dialog>
  )
}
