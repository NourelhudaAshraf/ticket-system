// A small spinning circle. The border width is written in rem (border-2 would emit px).
export default function Spinner({ className = 'size-6', label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-[0.125rem] border-current border-t-transparent ${className}`}
    />
  )
}
