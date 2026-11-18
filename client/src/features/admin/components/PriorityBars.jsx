import { useState } from 'react'
import { Link } from 'react-router'

// Highest priority first: the order is the scale itself, so it never changes with the counts.
const PRIORITIES = [
  { key: 'Urgent', label: 'Urgent' },
  { key: 'High', label: 'High' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Low', label: 'Low' },
]

// "How many tickets at each priority?" — horizontal bars on one shared baseline (lengths compare
// exactly), all in one hue because the bars are compared by length, not told apart by color.
// The count sits at the end of each bar; hover or focus shows the share; each row links to its tickets.
export default function PriorityBars({ byPriority, total, linkFor }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...PRIORITIES.map((p) => byPriority[p.key] ?? 0))

  return (
    <ul className="space-y-1" onMouseLeave={() => setActive(null)}>
      {PRIORITIES.map((p) => {
        const count = byPriority[p.key] ?? 0
        const share = total ? Math.round((count / total) * 100) : 0
        const dimmed = active && active !== p.key
        return (
          <li key={p.key}>
            <Link
              to={linkFor({ priority: p.key })}
              aria-label={`${p.label}: ${count} tickets, ${share}%. View tickets`}
              onMouseEnter={() => setActive(p.key)}
              onFocus={() => setActive(p.key)}
              onBlur={() => setActive(null)}
              className="grid min-h-11 grid-cols-[4.5rem_1fr] items-center gap-3 rounded-xl px-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <span className="text-sm text-slate-600">{p.label}</span>
              <span className="flex items-center gap-2">
                {/* Square at the baseline (left), 0.25rem rounded at the data end. A zero draws no bar. */}
                {count > 0 && (
                  <span
                    style={{ width: `calc((100% - 5rem) * ${count / max})` }}
                    className={`h-5 min-w-1 rounded-r-sm bg-[#2a78d6] transition-opacity ${dimmed ? 'opacity-40' : ''}`}
                  />
                )}
                <span className="text-sm font-semibold text-slate-900 tabular-nums">{count.toLocaleString()}</span>
                {active === p.key && <span className="text-xs text-slate-500 tabular-nums">{share}%</span>}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
