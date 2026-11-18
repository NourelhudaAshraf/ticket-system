import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getDashboard } from '../../api/dashboard.js'
import DateRangePicker from '../../components/ui/DateRangePicker.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { useApi } from '../../hooks/useApi.js'
import PriorityBars from './components/PriorityBars.jsx'
import StatusBreakdown from './components/StatusBreakdown.jsx'

// /admin/dashboard — the admin's start page. A headline row (total tickets, active tickets, agents,
// customers), then two charts: how tickets split across statuses, and how many sit at each priority.
// The date range limits the ticket numbers (not the people counts). Every number and chart part
// links to All tickets with the same filters (drill-down), so it matches the list it opens.
export default function DashboardPage() {
  const toast = useToast()
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')

  const { data, loading, error } = useApi(
    () => getDashboard({ createdFrom: createdFrom || undefined, createdTo: createdTo || undefined }),
    [createdFrom, createdTo],
  )

  useEffect(() => {
    if (error) toast.error(error.message)
  }, [error, toast])

  // /admin/tickets?status=Open&createdFrom=2026-11-01 — only the filters that are set.
  function ticketsLink(filter = {}) {
    const params = new URLSearchParams(filter)
    if (createdFrom) params.set('createdFrom', createdFrom)
    if (createdTo) params.set('createdTo', createdTo)
    const query = params.toString()
    return query ? `/admin/tickets?${query}` : '/admin/tickets'
  }

  const active = data ? data.byStatus.Open + data.byStatus.InProgress : 0

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">{createdFrom || createdTo ? 'Tickets created in the selected dates' : 'All tickets'}</p>
        </div>
        <DateRangePicker
          label="Created"
          from={createdFrom}
          to={createdTo}
          onChange={({ from, to }) => {
            setCreatedFrom(from)
            setCreatedTo(to)
          }}
          align="right"
          className="lg:w-80"
        />
      </div>

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-5">
            <Skeleton className="h-72 w-full rounded-2xl lg:col-span-3" />
            <Skeleton className="h-72 w-full rounded-2xl lg:col-span-2" />
          </div>
        </div>
      ) : data ? (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Headline row: the total leads, at hero size. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to={ticketsLink()}
              className="rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-md shadow-indigo-300/40 transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-[0.125rem] focus-visible:outline-indigo-600"
            >
              <span className="block text-sm font-medium text-blue-50">Total tickets</span>
              <span className="mt-1 block text-5xl font-bold tracking-tight tabular-nums">{data.total.toLocaleString()}</span>
              <span className="mt-2 block text-xs text-blue-100">View all →</span>
            </Link>
            <StatTile label="Active tickets" value={active} hint="Open + In Progress (see the status chart)" />
            <StatTile label="Agents" value={data.totalAgents} hint="All time" to="/admin/users?tab=agents" />
            <StatTile label="Customers" value={data.totalCustomers} hint="All time" to="/admin/users?tab=customers" />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel title="Tickets by status" subtitle="Share of tickets at each step of the lifecycle" className="lg:col-span-3">
              <StatusBreakdown byStatus={data.byStatus} total={data.total} linkFor={ticketsLink} />
            </Panel>
            <Panel title="Tickets by priority" subtitle="Number of tickets, highest priority first" className="lg:col-span-2">
              <PriorityBars byPriority={data.byPriority} total={data.total} linkFor={ticketsLink} />
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// A white card with a chart title.
function Panel({ title, subtitle, className = '', children }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mb-5 text-sm text-slate-500">{subtitle}</p>
      {children}
    </section>
  )
}

// One headline number. With `to` it links to the list behind it; without, it is plain text (used when
// no single list matches the number exactly).
function StatTile({ label, value, hint, to }) {
  const content = (
    <>
      <span className="block text-sm font-medium text-slate-500">{label}</span>
      <span className="mt-1 block text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{(value ?? 0).toLocaleString()}</span>
      <span className="mt-2 block text-xs text-slate-400 group-hover:text-indigo-600">{hint}</span>
    </>
  )
  const box = 'group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
  return to ? (
    <Link
      to={to}
      className={`${box} transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-[0.125rem] focus-visible:outline-indigo-600`}
    >
      {content}
    </Link>
  ) : (
    <div className={box}>{content}</div>
  )
}
