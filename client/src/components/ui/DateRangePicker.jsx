import { useEffect, useId, useRef, useState } from 'react'
import { fieldClasses } from './Input.jsx'

// A labeled "from – to" date picker: one button that opens a popover with quick ranges (Today,
// Last 7 days, ...) and a month calendar. Click a start day, then an end day; the range is applied
// on the second click. Dates are 'yyyy-mm-dd' strings (what the API's createdFrom / createdTo take),
// '' = not set.
//
//   <DateRangePicker label="Created" from={from} to={to} onChange={({ from, to }) => ...} />
//
// Keyboard: arrows move between days (±1 day / ±1 week), PageUp/PageDown change month,
// Enter/Space pick, Esc closes. Future days are disabled (tickets can't be created tomorrow).

// ---------- date helpers (local dates, no time zones) ----------
const pad = (n) => String(n).padStart(2, '0')
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const fullFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })

// The first day of the week for the user's locale (1 = Monday ... 7 = Sunday); Monday if unknown.
function firstDayOfWeek() {
  try {
    const locale = new Intl.Locale(navigator.language)
    const info = locale.getWeekInfo?.() ?? locale.weekInfo
    return info?.firstDay ?? 1
  } catch {
    return 1
  }
}
const FIRST_DAY = firstDayOfWeek() % 7 // as getDay(): 0 = Sunday

function presets(today) {
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Last 7 days', from: addDays(today, -6), to: today },
    { label: 'Last 30 days', from: addDays(today, -29), to: today },
    { label: 'This month', from: startOfMonth(today), to: today },
    { label: 'Last month', from: addMonths(today, -1), to: addDays(startOfMonth(today), -1) },
  ].map((p) => ({ label: p.label, from: toKey(p.from), to: toKey(p.to) }))
}

function summary(from, to) {
  if (!from && !to) return 'Any date'
  if (from && to) return from === to ? dayFormat.format(fromKey(from)) : `${dayFormat.format(fromKey(from))} – ${dayFormat.format(fromKey(to))}`
  return from ? `From ${dayFormat.format(fromKey(from))}` : `Until ${dayFormat.format(fromKey(to))}`
}

export default function DateRangePicker({ label, from = '', to = '', onChange, align = 'left', className = '' }) {
  const buttonId = useId()
  const panelId = `${buttonId}-panel`
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const gridRef = useRef(null)

  const todayKey = toKey(new Date())
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(fromKey(to || from || todayKey)))
  const [pendingFrom, setPendingFrom] = useState(null) // start day picked, waiting for the end day
  const [hoverKey, setHoverKey] = useState(null) // previews the range while choosing the end day
  const [focusKey, setFocusKey] = useState(to || from || todayKey) // the day that has keyboard focus

  function openPanel() {
    const start = to || from || todayKey
    setMonth(startOfMonth(fromKey(start)))
    setFocusKey(start)
    setPendingFrom(null)
    setHoverKey(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setPendingFrom(null)
    buttonRef.current?.focus()
  }

  function apply(range) {
    onChange(range)
    close()
  }

  function pickDay(key) {
    if (key > todayKey) return
    if (!pendingFrom) {
      setPendingFrom(key)
      return
    }
    // Second click: the earlier day becomes "from", whichever order they were clicked in.
    apply(key < pendingFrom ? { from: key, to: pendingFrom } : { from: pendingFrom, to: key })
  }

  // Focus the panel when it opens, and the focused day after every keyboard move.
  useEffect(() => {
    if (!open) return
    const day = gridRef.current?.querySelector(`[data-key="${focusKey}"]`)
    ;(day ?? panelRef.current)?.focus()
  }, [open, focusKey, month])

  function moveFocus(days) {
    const next = addDays(fromKey(focusKey), days)
    setFocusKey(toKey(next))
    if (startOfMonth(next).getTime() !== month.getTime()) setMonth(startOfMonth(next))
  }

  function onGridKeyDown(event) {
    const keys = {
      ArrowLeft: () => moveFocus(-1),
      ArrowRight: () => moveFocus(1),
      ArrowUp: () => moveFocus(-7),
      ArrowDown: () => moveFocus(7),
      PageUp: () => {
        setMonth((m) => addMonths(m, -1))
        setFocusKey(toKey(addMonths(month, -1)))
      },
      PageDown: () => {
        setMonth((m) => addMonths(m, 1))
        setFocusKey(toKey(addMonths(month, 1)))
      },
    }
    if (keys[event.key]) {
      event.preventDefault()
      keys[event.key]()
    }
  }

  // The 6×7 grid of days shown for `month`, starting on the locale's first weekday.
  const offset = (month.getDay() - FIRST_DAY + 7) % 7
  const gridStart = addDays(month, -offset)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const weekdays = days.slice(0, 7).map((d) => weekdayFormat.format(d))

  // The range to highlight: the applied one, or the one being chosen (start + hovered day).
  const [rangeFrom, rangeTo] = pendingFrom
    ? [pendingFrom, hoverKey ?? pendingFrom].sort()
    : [from, to]

  const isSet = !!(from || to)
  const presetList = presets(fromKey(todayKey))
  const activePreset = presetList.find((p) => p.from === from && p.to === to)

  return (
    <div className={className}>
      <label htmlFor={buttonId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => (open ? close() : openPanel())}
          className={`flex min-h-11 cursor-pointer items-center gap-2 pr-3 text-left hover:border-slate-300 ${fieldClasses} ${
            open ? 'border-indigo-500 ring-[0.25rem] ring-indigo-100' : ''
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={`size-5 shrink-0 ${isSet ? 'text-indigo-500' : 'text-slate-400'}`}>
            <path
              fillRule="evenodd"
              d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
              clipRule="evenodd"
            />
          </svg>
          <span className={`flex-1 truncate ${isSet ? '' : 'text-slate-400'}`}>{activePreset?.label ?? summary(from, to)}</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-500' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`${label}: choose dates`}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
              }
            }}
            // Close when focus leaves the panel (click outside, Tab away).
            onBlur={(event) =>
              !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== buttonRef.current && setOpen(false)
            }
            className={`dropdown-in absolute top-full z-30 mt-2 w-full min-w-[18rem] rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70 focus:outline-none sm:w-[24rem] lg:flex lg:w-[36rem] ${align === 'right' ? 'left-0 lg:right-0 lg:left-auto' : 'left-0'}`}
          >
            {/* Quick ranges: a scrolling row of chips on phones, a column on wider screens. */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 lg:w-36 lg:flex-col lg:border-r lg:border-b-0">
              {presetList.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => apply({ from: p.from, to: p.to })}
                  className={`min-h-8 shrink-0 rounded-lg px-3 text-left text-sm whitespace-nowrap transition-colors ${
                    activePreset?.label === p.label ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => apply({ from: '', to: '' })}
                className={`min-h-8 shrink-0 rounded-lg px-3 text-left text-sm whitespace-nowrap transition-colors ${
                  !isSet ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Any date
              </button>
            </div>

            <div className="flex-1 p-3">
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                  aria-label="Previous month"
                  className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  ‹
                </button>
                <span className="text-sm font-semibold text-slate-900" aria-live="polite">
                  {monthFormat.format(month)}
                </span>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  disabled={addMonths(month, 1) > fromKey(todayKey)}
                  aria-label="Next month"
                  className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-200 disabled:hover:bg-transparent"
                >
                  ›
                </button>
              </div>

              <div ref={gridRef} role="grid" aria-label={monthFormat.format(month)} onKeyDown={onGridKeyDown} onMouseLeave={() => setHoverKey(null)}>
                <div role="row" className="grid grid-cols-7">
                  {weekdays.map((w, i) => (
                    <span key={i} role="columnheader" className="flex h-6 items-center justify-center text-xs font-medium text-slate-400">
                      {w}
                    </span>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, week) => (
                  <div key={week} role="row" className="grid grid-cols-7">
                    {days.slice(week * 7, week * 7 + 7).map((d) => {
                      const key = toKey(d)
                      const inMonth = d.getMonth() === month.getMonth()
                      const future = key > todayKey
                      const isStart = rangeFrom && key === rangeFrom
                      const isEnd = rangeTo && key === rangeTo
                      const inRange = rangeFrom && rangeTo && key > rangeFrom && key < rangeTo
                      const edge = isStart || isEnd
                      return (
                        <span
                          key={key}
                          role="gridcell"
                          // The pale band behind the days joins the range from start to end.
                          className={`flex justify-center ${inRange ? 'bg-indigo-50' : ''} ${
                            isStart && rangeTo && rangeTo !== rangeFrom ? 'rounded-l-full bg-linear-to-r from-transparent from-50% to-indigo-50 to-50%' : ''
                          } ${isEnd && rangeFrom && rangeTo !== rangeFrom ? 'rounded-r-full bg-linear-to-l from-transparent from-50% to-indigo-50 to-50%' : ''}`}
                        >
                          <button
                            type="button"
                            data-key={key}
                            tabIndex={key === focusKey ? 0 : -1}
                            disabled={future}
                            aria-label={fullFormat.format(d)}
                            aria-pressed={!!edge}
                            aria-current={key === todayKey ? 'date' : undefined}
                            onClick={() => pickDay(key)}
                            onMouseEnter={() => pendingFrom && setHoverKey(key)}
                            onFocus={() => {
                              setFocusKey(key)
                              if (pendingFrom) setHoverKey(key)
                            }}
                            className={`relative inline-flex h-8 w-full max-w-11 items-center justify-center rounded-full text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                              edge
                                ? 'bg-linear-to-r from-blue-500 to-indigo-500 font-semibold text-white shadow-sm'
                                : future
                                  ? 'cursor-not-allowed text-slate-200'
                                  : inMonth
                                    ? 'text-slate-700 hover:bg-indigo-100'
                                    : 'text-slate-300 hover:bg-slate-100'
                            } ${key === todayKey && !edge ? 'font-semibold text-indigo-600' : ''}`}
                          >
                            {d.getDate()}
                            {key === todayKey && !edge && <span aria-hidden="true" className="absolute bottom-0.5 size-1 rounded-full bg-indigo-500" />}
                          </button>
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>

              <p className="mt-1 min-h-4 text-center text-xs text-slate-500" aria-live="polite">
                {pendingFrom ? `From ${dayFormat.format(fromKey(pendingFrom))} — now pick the end day` : 'Pick a start day, then an end day'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
