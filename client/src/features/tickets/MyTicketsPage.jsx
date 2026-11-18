import UnverifiedBanner from '../../components/UnverifiedBanner.jsx'
import LinkButton from '../../components/ui/LinkButton.jsx'
import TicketList from './components/TicketList.jsx'
import { ticketColumns as c } from './components/ticketColumns.jsx'

const columns = [c.title, c.category, c.status, c.priority, c.updated]

// /tickets — the customer's own tickets, newest activity first, with a status filter, search
// (ticket id or words from the title/description), and paging.
export default function MyTicketsPage() {
  return (
    <div>
      <UnverifiedBanner />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My tickets</h1>
        <LinkButton to="/tickets/new">New ticket</LinkButton>
      </div>

      <TicketList
        scope="mine"
        columns={columns}
        empty={{
          title: 'No tickets yet',
          message: "Tell us what you need help with and we'll get back to you.",
          action: <LinkButton to="/tickets/new">Submit a ticket</LinkButton>,
        }}
      />
    </div>
  )
}
