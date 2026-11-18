import PriorityBadge from '../../../components/PriorityBadge.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { formatDateTime } from '../../../utils/format.js'

// Title, id, badges, and when the ticket was opened.
export default function TicketHeader({ ticket }) {
  return (
    <header className="mb-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight break-words text-slate-900">{ticket.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        <span className="font-mono break-all">#{ticket.id}</span> · opened by {ticket.customerName} on{' '}
        {formatDateTime(ticket.createdAt)}
      </p>
    </header>
  )
}
