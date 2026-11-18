import TicketList from '../tickets/components/TicketList.jsx'
import { ticketColumns as c } from '../tickets/components/ticketColumns.jsx'

const columns = [c.title, c.customer, c.category, c.status, c.priority, c.updated]

// /queue — the agent's start page: tickets assigned to them (from any category), with status and
// priority filters, sorting, search, and paging.
export default function AgentQueuePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">My queue</h1>
      <TicketList
        scope="assigned"
        columns={columns}
        showPriority
        showSort
        empty={{ title: 'Your queue is empty', message: 'New tickets assigned to you will show up here.' }}
      />
    </div>
  )
}
