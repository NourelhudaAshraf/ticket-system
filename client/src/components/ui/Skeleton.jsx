// A grey pulsing block shown where content will appear while it loads. Size it with className.
export default function Skeleton({ className = 'h-4 w-full' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
}
