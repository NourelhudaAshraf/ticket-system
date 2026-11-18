// The frame for the sign-in, forgot-password, and reset-password pages: a full-screen blue → indigo →
// purple gradient with two soft blurred glows behind it, and a white card in the middle with the app
// logo, the page title, an optional subtitle, and the form.
export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-linear-to-br from-sky-100 via-indigo-100 to-purple-200 px-4 py-10">
      {/* Decorative glows (purely visual) */}
      <div aria-hidden="true" className="absolute -top-32 -left-32 size-96 rounded-full bg-cyan-200/60 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-32 -bottom-32 size-96 rounded-full bg-pink-200/60 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-slate-800">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/70 text-indigo-600 shadow-sm ring ring-white backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
            </svg>
          </span>
          <span className="text-xl font-semibold tracking-tight">Ticket System</span>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-indigo-200/70 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
