// What a list shows when it has nothing in it: a title, a short message, and an optional button.
export default function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
