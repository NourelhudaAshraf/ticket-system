import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getTicket } from '../../api/tickets.js'
import { useAuth } from '../../auth/useAuth.js'
import LinkButton from '../../components/ui/LinkButton.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { useApi } from '../../hooks/useApi.js'
import { formatDateTime } from '../../utils/format.js'
import NotFoundPage from '../common/NotFoundPage.jsx'
import CommentForm from './components/CommentForm.jsx'
import Conversation from './components/Conversation.jsx'
import TicketActions from './components/TicketActions.jsx'
import TicketHeader from './components/TicketHeader.jsx'

// /tickets/:id — one ticket for any role that can see it. One column on phones; from lg (64rem) the
// conversation sits on the left and a details panel on the right. What the user may do comes from
// ticket.permissions (computed by the API), so the page never guesses.
export default function TicketDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: ticket, loading, error, reload } = useApi(() => getTicket(id), [id])

  // After a status/priority/reassign change. If a reassignment moved the ticket out of this user's
  // reach (another agent, a category they're not in), go back to the queue instead of showing 404.
  function onUpdated(updated) {
    if (updated && !updated.permissions.canView) navigate('/', { replace: true })
    else reload()
  }

  const { canChangeStatus, canEditPriority, canReassign } = ticket?.permissions ?? {}
  const showActions = canChangeStatus || canEditPriority || canReassign

  useEffect(() => {
    if (error && error.status !== 404) toast.error(error.message)
  }, [error, toast])

  // The API answers 404 both for missing tickets and for tickets this user may not see.
  if (error?.status === 404) return <NotFoundPage />

  if (loading && !ticket) return <DetailSkeleton />
  if (!ticket) return null

  const readOnly = ticket.status === 'Resolved' || ticket.status === 'Closed'

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="min-w-0 lg:col-span-2">
        <TicketHeader ticket={ticket} />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="sr-only">Description</h2>
          <p className="text-sm break-words whitespace-pre-wrap text-slate-700">{ticket.description}</p>
        </section>

        <Conversation comments={ticket.comments} />

        {ticket.permissions.canComment ? (
          <CommentForm ticketId={ticket.id} onAdded={reload} />
        ) : readOnly ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              This ticket is {ticket.status === 'Resolved' ? 'resolved' : 'closed'} and can no longer be replied to.
            </p>
            {user.role === 'Customer' && (
              <LinkButton to={`/tickets/new?relatedTo=${ticket.id}`} className="shrink-0">
                Submit a follow-up ticket
              </LinkButton>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
        {showActions && <TicketActions ticket={ticket} onUpdated={onUpdated} />}

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">Details</h2>
          <dl className="space-y-3 text-sm">
            <Detail label="Category">{ticket.categoryName}</Detail>
            <Detail label="Assigned agent">{ticket.assignedAgentName}</Detail>
            <Detail label="Customer">{ticket.customerName}</Detail>
            <Detail label="Created">{formatDateTime(ticket.createdAt)}</Detail>
            <Detail label="Last updated">{formatDateTime(ticket.updatedAt)}</Detail>
            {ticket.resolvedAt && <Detail label="Resolved">{formatDateTime(ticket.resolvedAt)}</Detail>}
            {ticket.closedAt && <Detail label="Closed">{formatDateTime(ticket.closedAt)}</Detail>}
            {ticket.relatedTicketId && (
              <Detail label="Follow-up to">
                <Link to={`/tickets/${ticket.relatedTicketId}`} className="font-mono break-all text-indigo-600 hover:text-indigo-800">
                  {ticket.relatedTicketId}
                </Link>
              </Detail>
            )}
          </dl>
        </aside>
      </div>
    </div>
  )
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
