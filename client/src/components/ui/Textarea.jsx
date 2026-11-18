import { useId } from 'react'
import FieldError from './FieldError.jsx'
import { fieldClasses } from './Input.jsx'

// A labeled multi-line input; same props as Input.
export default function Textarea({ label, error, id, rows = 5, className = '', ...props }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`py-2 ${fieldClasses}`}
        {...props}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}
