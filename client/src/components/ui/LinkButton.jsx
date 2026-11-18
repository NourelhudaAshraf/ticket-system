import { Link } from 'react-router'

const variants = {
  primary:
    'bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-indigo-300/40 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg',
  secondary: 'bg-white text-slate-700 shadow-sm ring ring-slate-200 hover:bg-slate-50',
}

// A router link that looks like <Button>: use it when "clicking the button" just opens another page.
export default function LinkButton({ to, variant = 'primary', className = '', children }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-offset-[0.125rem] focus-visible:outline-indigo-600 md:w-auto ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}
