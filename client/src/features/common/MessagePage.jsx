import { Link } from 'react-router'

// Shared look for full-page messages (Not found, Not allowed, Coming soon): a white card with a
// round gradient icon, a title, a short text, and an optional "Go to your start page" button.
export default function MessagePage({ icon, title, message, showHomeLink = true }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-linear-to-br from-sky-400 to-indigo-500 text-3xl text-white shadow-lg shadow-indigo-300/40">
        {icon}
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-500">{message}</p>
      {showHomeLink && (
        <Link
          to="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-300/40 hover:from-blue-600 hover:to-indigo-600"
        >
          Go to your start page
        </Link>
      )}
    </div>
  )
}
