import { useEffect, useState } from 'react'
import { deleteCategory, listCategories } from '../../api/categories.js'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Table from '../../components/ui/Table.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { useApi } from '../../hooks/useApi.js'
import CategoryFormModal from './components/CategoryFormModal.jsx'

// /admin/categories — list, create, rename / change default agent, and delete (soft) categories.
export default function AdminCategoriesPage() {
  const toast = useToast()
  const categories = useApi(listCategories)
  const [dialog, setDialog] = useState(null) // null | { category: null (new) | category (edit) }
  const [deleting, setDeleting] = useState(null) // the category waiting for delete confirmation
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (categories.error) toast.error(categories.error.message)
  }, [categories.error, toast])

  async function confirmDelete() {
    setBusy(true)
    try {
      await deleteCategory(deleting.id)
      toast.success(`Category “${deleting.name}” deleted.`)
      setDeleting(null)
      categories.reload()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    { key: 'defaultAgentName', header: 'Default agent', render: (c) => c.defaultAgentName ?? <span className="text-slate-400">—</span> },
    { key: 'agentCount', header: 'Agents' },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <span className="flex flex-col gap-2 md:flex-row md:justify-end">
          <Button variant="ghost" onClick={() => setDialog({ category: c })} className="md:min-h-9 md:px-3">
            Edit
          </Button>
          <Button variant="ghost" onClick={() => setDeleting(c)} className="text-red-600 hover:bg-red-50 md:min-h-9 md:px-3">
            Delete
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
        <Button onClick={() => setDialog({ category: null })}>New category</Button>
      </div>

      {categories.loading && !categories.data ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : categories.data?.length ? (
        <Table columns={columns} rows={categories.data} />
      ) : categories.data ? (
        <EmptyState title="No categories yet" message="Customers pick a category when they submit a ticket." />
      ) : null}

      <CategoryFormModal
        open={dialog !== null}
        category={dialog?.category ?? null}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null)
          categories.reload()
        }}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete category?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          <strong>{deleting?.name}</strong> will no longer be offered for new tickets or shown in any list. Existing tickets keep this category
          name.
        </p>
      </Modal>
    </div>
  )
}
