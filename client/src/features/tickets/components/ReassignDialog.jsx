import { useState } from 'react'
import { listAgents } from '../../../api/agents.js'
import { assignTicket } from '../../../api/tickets.js'
import Button from '../../../components/ui/Button.jsx'
import Modal from '../../../components/ui/Modal.jsx'
import Select from '../../../components/ui/Select.jsx'
import Spinner from '../../../components/ui/Spinner.jsx'
import { useToast } from '../../../components/ui/useToast.js'
import { useApi } from '../../../hooks/useApi.js'

// Hand the ticket to another agent: first pick a category (the ticket's category becomes it), then
// one of the agents who belong to that category. A ticket filed under the wrong area moves to the
// right place and the right person.
export default function ReassignDialog({ open, ticket, onClose, onReassigned }) {
  const toast = useToast()
  const agents = useApi(() => (open ? listAgents() : Promise.resolve(null)), [open])
  const [pickedCategoryId, setPickedCategoryId] = useState(null) // null = not changed yet
  const [agentId, setAgentId] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Categories that have at least one agent, sorted by name — built from the agents list
  // (each agent carries their non-deleted categories), so no extra request is needed.
  const categoryMap = new Map()
  for (const a of agents.data ?? []) for (const c of a.categories) categoryMap.set(c.id, c.name)
  const categories = [...categoryMap].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name))

  // Starts on the ticket's current category (if it still has agents).
  const categoryId = pickedCategoryId ?? (categoryMap.has(ticket.categoryId) ? ticket.categoryId : '')
  const categoryName = categoryMap.get(categoryId)

  // Agents of the chosen category. The current agent can't be picked again for the same category
  // (nothing would change).
  const categoryAgents = (agents.data ?? []).filter((a) => a.categories.some((c) => c.id === categoryId))
  const isCurrent = (a) => a.id === ticket.assignedAgentId && categoryId === ticket.categoryId
  const agent = categoryAgents.find((a) => a.id === agentId)

  function close() {
    setPickedCategoryId(null)
    setAgentId('')
    setFieldError(null)
    onClose()
  }

  function pickCategory(id) {
    setPickedCategoryId(id)
    setAgentId('') // the old choice may not belong to the new category
    setFieldError(null)
  }

  async function save() {
    setSaving(true)
    setFieldError(null)
    try {
      const updated = await assignTicket(ticket.id, { agentId, categoryId })
      toast.success(`Ticket reassigned to ${agent.name}.`)
      setPickedCategoryId(null)
      setAgentId('')
      onReassigned(updated)
    } catch (error) {
      // e.g. the agent left that category meanwhile: show it in the dialog.
      if (error.code === 'agent_not_eligible' || error.code === 'category_deleted') setFieldError(error.message)
      else toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reassign ticket"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!agentId || !categoryId} onClick={save}>
            Reassign
          </Button>
        </>
      }
    >
      {agents.loading && !agents.data ? (
        <div className="flex justify-center py-8 text-indigo-600">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Currently assigned to <strong>{ticket.assignedAgentName}</strong> in <strong>{ticket.categoryName}</strong>.
          </p>

          <Select label="Category" value={categoryId} onChange={(event) => pickCategory(event.target.value)}>
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === ticket.categoryId ? `${c.name} (current)` : c.name}
              </option>
            ))}
          </Select>

          {categoryId && (
            // key: a fresh dropdown per category, so it never shows an agent from the previous one.
            <Select
              key={categoryId}
              label={`Agent in ${categoryName}`}
              value={agentId}
              error={fieldError}
              onChange={(event) => {
                setAgentId(event.target.value)
                setFieldError(null)
              }}
            >
              <option value="">Choose an agent</option>
              {categoryAgents.map((a) => (
                <option key={a.id} value={a.id} disabled={isCurrent(a)}>
                  {isCurrent(a) ? `${a.name} (assigned now)` : a.name}
                </option>
              ))}
            </Select>
          )}

          {categoryId && categoryId !== ticket.categoryId && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              The ticket&apos;s category will change from <strong>{ticket.categoryName}</strong> to{' '}
              <strong>{categoryName}</strong>.
            </p>
          )}

          {!categoryId && fieldError &&<p className="text-sm text-red-600">{fieldError}</p>}
        </div>
      )}
    </Modal>
  )
}
