import { useState } from 'react'
import { Link } from 'react-router'

// Categorical colors in a fixed order (blue, orange, aqua, yellow), checked for color-blind
// separation. Aqua and yellow are low-contrast on white, so every part also has a printed label
// and a row in the list below — color is never the only way to tell them apart.
const PARTS = [
  { key: 'Open', label: 'Open', color: 'bg-[#2a78d6]', ink: 'text-white' },
  { key: 'InProgress', label: 'In Progress', color: 'bg-[#eb6834]', ink: 'text-white' },
  { key: 'Resolved', label: 'Resolved', color: 'bg-[#1baf7a]', ink: 'text-slate-950' },
  { key: 'Closed', label: 'Closed', color: 'bg-[#eda100]', ink: 'text-slate-950' },
]

const percent = (count, total) => (total ? Math.round((count / total) * 100) : 0)

// "How do the tickets split across the lifecycle?" — one segmented bar (each status a block, its
// width = its share), with the share printed on blocks wide enough to hold it, a tooltip on hover or
// keyboard focus, and a list with the exact counts. Every block and row links to the matching tickets.
export default function StatusBreakdown({ byStatus, total, linkFor }) {
  const [active, setActive] = useState(null)

  // Where each block starts and how wide it is (percent of the bar), for the tooltip position.
  const widths = PARTS.map((p) => (total ? ((byStatus[p.key] ?? 0) / total) * 100 : 0))
  const parts = PARTS.map((p, i) => {
    const before = widths.slice(0, i).reduce((sum, w) => sum + w, 0)
    return { ...p, count: byStatus[p.key] ?? 0, width: widths[i], center: before + widths[i] / 2 }
  })
  const hovered = parts.find((p) => p.key === active)

  return (
    <div>
      {total === 0 ? (
        <div className="h-7 rounded-sm bg-slate-100" aria-label="No tickets" />
      ) : (
        <div className="relative">
          <div
            className="flex h-7 gap-0.5"
            role="group"
            aria-label={`Tickets by status: ${parts.map((p) => `${p.label} ${p.count}`).join(', ')}`}
            onMouseLeave={() => setActive(null)}
          >
            {parts
              .filter((p) => p.count > 0)
              .map((p) => (
                <Link
                  key={p.key}
                  to={linkFor({ status: p.key })}
                  style={{ width: `${p.width}%` }}
                  aria-label={`${p.label}: ${p.count} tickets, ${percent(p.count, total)}%. View tickets`}
                  onMouseEnter={() => setActive(p.key)}
                  onFocus={() => setActive(p.key)}
                  onBlur={() => setActive(null)}
                  className={`flex min-w-1 items-center overflow-hidden rounded-sm px-2 text-xs font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-[0.125rem] focus-visible:outline-indigo-600 ${p.color} ${p.ink} ${
                    active && active !== p.key ? 'opacity-40' : ''
                  }`}
                >
                  {/* Only blocks with room for the label print it; the list below always has the number. */}
                  {p.width >= 8 && <span aria-hidden="true">{percent(p.count, total)}%</span>}
                </Link>
              ))}
          </div>

          {hovered && (
            <div
              role="tooltip"
              style={{ left: `clamp(4rem, ${hovered.center}%, calc(100% - 4rem))` }}
              className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
            >
              <span className="font-semibold">{hovered.label}</span> · {hovered.count.toLocaleString()} tickets ·{' '}
              {percent(hovered.count, total)}%
            </div>
          )}
        </div>
      )}

      {/* The table view: name, exact count, and share for every status (including zeros). */}
      <ul className="mt-5 grid gap-1 sm:grid-cols-2">
        {parts.map((p) => (
          <li key={p.key}>
            <Link
              to={linkFor({ status: p.key })}
              onMouseEnter={() => setActive(p.key)}
              onMouseLeave={() => setActive(null)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <span aria-hidden="true" className={`size-3 shrink-0 rounded-sm ${p.color}`} />
              <span className="flex-1 text-slate-700">{p.label}</span>
              <span className="font-semibold text-slate-900 tabular-nums">{p.count.toLocaleString()}</span>
              <span className="w-10 text-right text-slate-500 tabular-nums">{percent(p.count, total)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
