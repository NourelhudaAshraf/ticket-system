import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { listTickets } from '../../../api/tickets.js'
import Button from '../../../components/ui/Button.jsx'
import EmptyState from '../../../components/ui/EmptyState.jsx'
import Input from '../../../components/ui/Input.jsx'
import Pagination from '../../../components/ui/Pagination.jsx'
import Select from '../../../components/ui/Select.jsx'
import Skeleton from '../../../components/ui/Skeleton.jsx'
import Table from '../../../components/ui/Table.jsx'
import { useToast } from '../../../components/ui/useToast.js'
import { useApi } from '../../../hooks/useApi.js'

const PAGE_SIZE = 20

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
]

const PRIORITIES = [
  { value: '', label: 'All priorities' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
]

// Each choice is one { sort, dir } pair the API understands.
const SORTS = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'priority:desc', label: 'Priority: high to low' },
  { value: 'priority:asc', label: 'Priority: low to high' },
]

// A searchable, filterable, paged ticket list used by My tickets, My queue, Category tickets, and
// All tickets (admin).
// `scope` / `categoryId` choose which tickets (the API checks the role may use that scope).
// `columns` are Table columns; `showPriority` / `showSort` add those filters; `empty` is the
// { title, message, action } shown when there are no tickets at all (not just no matches).
// Admin page extras: `categories` ([{ id, name }]) adds a Category filter; `initial` ({ status,
// priority, categoryId }) sets the starting filters; `createdFrom` / `createdTo` limit by date.
export default function TicketList({
  scope,
  categoryId,
  columns,
  showPriority = false,
  showSort = false,
  empty,
  categories,
  initial = {},
  createdFrom,
  createdTo,
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState(initial.status ?? '')
  const [priority, setPriority] = useState(initial.priority ?? '')
  const [category, setCategory] = useState(initial.categoryId ?? '')
  const [sortChoice, setSortChoice] = useState(SORTS[0].value)
  const [searchText, setSearchText] = useState('') // what is typed
  const [q, setQ] = useState('') // what was searched (on submit)
  const [page, setPage] = useState(1)

  const [sort, dir] = sortChoice.split(':')
  // The Category filter (admin) wins over the categoryId prop (agent category tabs).
  const effectiveCategoryId = categories ? category || undefined : categoryId

  const { data, loading, error } = useApi(
    () =>
      listTickets({
        scope,
        categoryId: effectiveCategoryId,
        status: status ? [status] : [],
        priority: priority ? [priority] : [],
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        q: q || undefined,
        sort,
        dir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [scope, effectiveCategoryId, status, priority, createdFrom, createdTo, sort, dir, q, page],
  )

  // A date change from the parent page also starts again from page 1.
  const [lastDates, setLastDates] = useState(`${createdFrom}|${createdTo}`)
  if (lastDates !== `${createdFrom}|${createdTo}`) {
    setLastDates(`${createdFrom}|${createdTo}`)
    setPage(1)
  }

  useEffect(() => {
    if (error) toast.error(error.message)
  }, [error, toast])

  // Any filter change starts again from page 1.
  const onFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  function search(event) {
    event.preventDefault()
    setQ(searchText.trim())
    setPage(1)
  }

  const filtered = status !== '' || priority !== '' || category !== '' || q !== '' || !!createdFrom || !!createdTo

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:flex lg:items-end">
        <Select label="Status" value={status} onChange={onFilter(setStatus)} className="lg:w-44">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        {showPriority && (
          <Select label="Priority" value={priority} onChange={onFilter(setPriority)} className="lg:w-44">
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        )}

        {categories && (
          <Select label="Category" value={category} onChange={onFilter(setCategory)} className="lg:w-52">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}

        {showSort && (
          <Select label="Sort by" value={sortChoice} onChange={onFilter(setSortChoice)} className="lg:w-56">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        )}

        <form onSubmit={search} role="search" className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-end lg:flex-1">
          <Input
            label="Search"
            type="search"
            placeholder="Ticket id or words from the title"
            maxLength={100}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {loading && !data ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : data?.items.length ? (
        <>
          <Table columns={columns} rows={data.items} onRowClick={(t) => navigate(`/tickets/${t.id}`)} />
          <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onPageChange={setPage} />
        </>
      ) : data && filtered ? (
        <EmptyState title="No matching tickets" message="Try other filters or another search." />
      ) : data ? (
        <EmptyState {...empty} />
      ) : null}
    </div>
  )
}
