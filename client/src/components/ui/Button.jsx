import Spinner from './Spinner.jsx'

const variants = {
  primary:
    'bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-indigo-300/40 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg disabled:from-blue-300 disabled:to-indigo-300 disabled:shadow-none',
  secondary: 'bg-white text-slate-700 shadow-sm ring ring-slate-200 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-linear-to-r from-red-400 to-rose-500 text-white shadow-md shadow-red-300/40 hover:from-red-500 hover:to-rose-600 disabled:from-red-300 disabled:to-rose-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
}

// Full width on phones, natural width from md (48rem). At least 2.75rem tall for touch.
// `loading` shows a spinner and disables the button so a form can't be sent twice.
export default function Button({ variant = 'primary', type = 'button', loading = false, disabled, className = '', children, ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-offset-[0.125rem] focus-visible:outline-indigo-600 disabled:cursor-not-allowed md:w-auto ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}
