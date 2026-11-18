import { NavLink, useParams } from 'react-router'
import { listCategories } from '../../api/categories.js'
import { useAuth } from '../../auth/useAuth.js'
import Badge from '../../components/ui/Badge.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { useApi } from '../../hooks/useApi.js'
import TicketList from '../tickets/components/TicketList.jsx'
import { ticketColumns as c } from '../tickets/components/ticketColumns.jsx'

// /categories/:categoryId? — every ticket in the agent's categories, whoever it is assigned to.
// One tab per category plus "All". Tickets assigned to someone else are read-only for this agent
// (they can open and read them, not reply or change them), so they get a "Read-only" badge.
export default function CategoryTicketsPage() {
  const { categoryId } = useParams()
  const { user } = useAuth()
  const categories = useApi(listCategories)

  // Only the categories this agent belongs to, in the API's (alphabetical) order.
  const mine = categories.data?.filter((cat) => user.categoryIds.includes(cat.id)) ?? []

  const columns = [
    c.title,
    ...(categoryId ? [] : [c.category]),
    {
      key: 'assignedAgentName',
      header: 'Assigned to',
      render: (t) =>
        t.assignedAgentId === user.id ? (
          <span className="font-medium text-indigo-700">You</span>
        ) : (
          <span className="inline-flex flex-wrap items-center justify-end gap-2 md:justify-start">
            {t.assignedAgentName}
            <Badge>Read-only</Badge>
          </span>
        ),
    },
    c.status,
    c.priority,
    c.updated,
  ]

  if (user.categoryIds.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Category tickets</h1>
        <EmptyState title="No categories yet" message="Ask an admin to add you to a category." />
      </div>
    )
  }

  const tabClass = ({ isActive }) =>
    `inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-medium whitespace-nowrap transition-colors ${
      isActive ? 'bg-white text-indigo-700 shadow-sm ring ring-slate-200' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Category tickets</h1>

      {/* Tabs scroll sideways on narrow screens instead of widening the page. */}
      <nav aria-label="Categories" className="mb-6 -mx-1 overflow-x-auto">
        <div className="inline-flex gap-1 rounded-2xl bg-slate-100 p-1">
          <NavLink to="/categories" end className={tabClass}>
            All my categories
          </NavLink>
          {categories.loading && !categories.data ? (
            <Skeleton className="h-11 w-32" />
          ) : (
            mine.map((cat) => (
              <NavLink key={cat.id} to={`/categories/${cat.id}`} className={tabClass}>
                {cat.name}
              </NavLink>
            ))
          )}
        </div>
      </nav>

      {/* key: a new tab starts with fresh filters and page 1. */}
      <TicketList
        key={categoryId ?? 'all'}
        scope="category"
        categoryId={categoryId}
        columns={columns}
        showPriority
        showSort
        empty={{ title: 'No tickets here', message: 'Tickets in this category will show up here.' }}
      />
    </div>
  )
}
