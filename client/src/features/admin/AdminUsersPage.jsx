import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { listCategories } from '../../api/categories.js'
import { listUsers } from '../../api/users.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Input from '../../components/ui/Input.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Table from '../../components/ui/Table.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { useApi } from '../../hooks/useApi.js'
import UserFormModal from './components/UserFormModal.jsx'

const PAGE_SIZE = 20

const TABS = [
  { key: 'customers', label: 'Customers', role: 'Customer' },
  { key: 'agents', label: 'Agents', role: 'Agent' },
]

// /admin/users — users in two tabs, Customers and Agents (the tab is kept in the URL: ?tab=agents).
// Search by name or email, paging, "Invite agent", and an Edit dialog for name, role, and
// categories. There is no delete or deactivate (FR-025).
export default function AdminUsersPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((t) => t.key === searchParams.get('tab')) ?? TABS[0]

  const [searchText, setSearchText] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null) // null | { user: null (invite) | user (edit) }

  const users = useApi(() => listUsers({ role: tab.role, q: q || undefined, page, pageSize: PAGE_SIZE }), [tab.role, q, page])
  const categories = useApi(listCategories)
  const categoryNames = Object.fromEntries((categories.data ?? []).map((c) => [c.id, c.name]))

  useEffect(() => {
    if (users.error) toast.error(users.error.message)
  }, [users.error, toast])

  function switchTab(key) {
    setSearchParams({ tab: key })
    setSearchText('')
    setQ('')
    setPage(1)
  }

  function search(event) {
    event.preventDefault()
    setQ(searchText.trim())
    setPage(1)
  }

  const editButton = (u) => (
    <Button variant="ghost" onClick={() => setDialog({ user: u })} className="md:min-h-9 md:px-3">
      Edit
    </Button>
  )

  const columns =
    tab.role === 'Agent'
      ? [
          { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-slate-900">{u.name}</span> },
          { key: 'email', header: 'Email', render: (u) => <span className="break-all">{u.email}</span> },
          {
            key: 'categories',
            header: 'Categories',
            render: (u) =>
              u.categoryIds.length ? (
                <span className="inline-flex flex-wrap justify-end gap-1 md:justify-start">
                  {u.categoryIds.map((id) => categoryNames[id] && <Badge key={id} tone="blue">{categoryNames[id]}</Badge>)}
                </span>
              ) : (
                <span className="text-slate-400">None</span>
              ),
          },
          { key: 'status', header: 'Status', render: statusBadge },
          { key: 'actions', header: '', render: editButton },
        ]
      : [
          { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-slate-900">{u.name}</span> },
          { key: 'email', header: 'Email', render: (u) => <span className="break-all">{u.email}</span> },
          { key: 'status', header: 'Status', render: statusBadge },
          { key: 'actions', header: '', render: editButton },
        ]

  const tabClass = (active) =>
    `inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors ${
      active ? 'bg-white text-indigo-700 shadow-sm ring ring-slate-200' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
        {tab.role === 'Agent' && <Button onClick={() => setDialog({ user: null })}>Invite agent</Button>}
      </div>

      <div role="tablist" aria-label="User type" className="mb-6 inline-flex gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} onClick={() => switchTab(t.key)} className={tabClass(t.key === tab.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={search} role="search" className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        <Input
          key={tab.key}
          label="Search"
          type="search"
          placeholder="Name or email"
          maxLength={100}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {users.loading && !users.data ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : users.data?.items.length ? (
        <>
          <Table columns={columns} rows={users.data.items} />
          <Pagination page={users.data.page} pageSize={users.data.pageSize} totalCount={users.data.totalCount} onPageChange={setPage} />
        </>
      ) : users.data ? (
        <EmptyState
          title={q ? 'No matching users' : `No ${tab.label.toLowerCase()} yet`}
          message={q ? 'Try another name or email.' : tab.role === 'Agent' ? 'Invite an agent to get started.' : 'Customers appear here when they register.'}
        />
      ) : null}

      <UserFormModal
        open={dialog !== null}
        user={dialog?.user ?? null}
        categories={categories.data ?? []}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null)
          users.reload()
        }}
      />
    </div>
  )
}

function statusBadge(u) {
  // Pending = an invited user who hasn't set a password yet, or a customer who hasn't verified their email.
  return u.emailVerified ? <Badge tone="green">Active</Badge> : <Badge tone="yellow">Pending</Badge>
}
