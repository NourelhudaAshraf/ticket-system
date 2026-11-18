import { useState } from 'react'
import { changeStatus, updatePriority } from '../../../api/tickets.js'
import Button from '../../../components/ui/Button.jsx'
import Select from '../../../components/ui/Select.jsx'
import { useToast } from '../../../components/ui/useToast.js'
import ReassignDialog from './ReassignDialog.jsx'

const STATUS_LABELS = { Open: 'Open', InProgress: 'In Progress', Resolved: 'Resolved', Closed: 'Closed' }

// The button text for moving to each status (one step at a time: Open → In Progress → Resolved → Closed).
const STATUS_ACTIONS = {
  InProgress: { label: 'Start work', variant: 'primary' },
  Resolved: { label: 'Mark as resolved', variant: 'primary' },
  Closed: { label: 'Close ticket', variant: 'secondary' },
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

// Agent/admin controls in the ticket's side panel. Which ones appear comes from ticket.permissions
// (computed by the API). After a change, onUpdated(updatedTicket) lets the page refresh.
export default function TicketActions({ ticket, onUpdated }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null) // which action is running, e.g. "status:Resolved"
  const [reassignOpen, setReassignOpen] = useState(false)
  const { permissions } = ticket

  async function run(key, action, successMessage) {
    setBusy(key)
    try {
      const updated = await action()
      toast.success(successMessage)
      onUpdated(updated)
    } catch (error) {
      if (error.code === 'invalid_transition') {
        const next = error.allowedNext.map((s) => STATUS_LABELS[s] ?? s).join(', ')
        toast.error(next ? `${error.message} Next allowed: ${next}.` : `${error.message} This ticket is already closed.`)
        onUpdated(null) // someone else may have changed it; reload
      } else {
        toast.error(error.message)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="actions-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="actions-heading" className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Actions
      </h2>

      <div className="space-y-4">
        {permissions.canChangeStatus &&
          (permissions.allowedNextStatuses.length > 0 ? (
            <div className="flex flex-col gap-2">
              {permissions.allowedNextStatuses.map((status) => {
                const action = STATUS_ACTIONS[status] ?? { label: `Move to ${STATUS_LABELS[status]}`, variant: 'primary' }
                return (
                  <Button
                    key={status}
                    variant={action.variant}
                    loading={busy === `status:${status}`}
                    disabled={busy !== null}
                    onClick={() =>
                      run(`status:${status}`, () => changeStatus(ticket.id, status), `Status changed to ${STATUS_LABELS[status]}.`)
                    }
                    className="md:w-full"
                  >
                    {action.label}
                  </Button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">This ticket is closed; its status can't change any more.</p>
          ))}

        {permissions.canEditPriority && (
          <Select
            label="Priority"
            value={ticket.priority}
            disabled={busy !== null}
            onChange={(event) => {
              const priority = event.target.value
              if (priority !== ticket.priority)
                run('priority', () => updatePriority(ticket.id, priority), `Priority changed to ${priority}.`)
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        )}

        {permissions.canReassign && (
          <Button variant="secondary" disabled={busy !== null} onClick={() => setReassignOpen(true)} className="md:w-full">
            Reassign
          </Button>
        )}
      </div>

      {permissions.canReassign && (
        <ReassignDialog
          open={reassignOpen}
          ticket={ticket}
          onClose={() => setReassignOpen(false)}
          onReassigned={(updated) => {
            setReassignOpen(false)
            onUpdated(updated)
          }}
        />
      )}
    </section>
  )
}
