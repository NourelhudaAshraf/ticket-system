import { useId } from 'react'
import FieldError from './FieldError.jsx'

export const fieldClasses =
  'block w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-[0.25rem] focus:ring-indigo-100 aria-invalid:border-red-400 aria-invalid:focus:ring-red-100'

// A labeled text input with its error message underneath. Extra props (type, placeholder, and the
// `ref`/`onChange` from react-hook-form's register) are passed straight to the <input>.
export default function Input({ label, error, id, className = '', ...props }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-11 ${fieldClasses}`}
        {...props}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}
