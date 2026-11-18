import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { listCategories } from '../../api/categories.js'
import DateRangePicker from '../../components/ui/DateRangePicker.jsx'
import { useApi } from '../../hooks/useApi.js'
import TicketList from '../tickets/components/TicketList.jsx'
import { ticketColumns as c } from '../tickets/components/ticketColumns.jsx'

const columns = [c.title, c.customer, c.category, c.assignedTo, c.status, c.priority, c.updated]

// /admin/tickets — every ticket (scope=all) with status, priority, category, and date filters,
// search, sorting, and paging. The starting filters come from the query string, so the dashboard
// cards can link here, e.g. /admin/tickets?priority=High&createdFrom=2026-11-01.
export default function AdminTicketsPage() {
  const [searchParams] = useSearchParams()
  const [createdFrom, setCreatedFrom] = useState(searchParams.get('createdFrom') ?? '')
  const [createdTo, setCreatedTo] = useState(searchParams.get('createdTo') ?? '')
  const categories = useApi(listCategories)

  const initial = {
    status: searchParams.get('status') ?? '',
    priority: searchParams.get('priority') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">All tickets</h1>

      <DateRangePicker
        label="Created"
        from={createdFrom}
        to={createdTo}
        onChange={({ from, to }) => {
          setCreatedFrom(from)
          setCreatedTo(to)
        }}
        className="mb-3 md:w-80"
      />

      <TicketList
        scope="all"
        columns={columns}
        showPriority
        showSort
        categories={categories.data ?? []}
        initial={initial}
        createdFrom={createdFrom}
        createdTo={createdTo}
        empty={{ title: 'No tickets yet', message: 'Tickets appear here when customers submit them.' }}
      />
    </div>
  )
}
