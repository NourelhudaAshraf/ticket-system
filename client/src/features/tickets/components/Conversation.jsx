import Badge from '../../../components/ui/Badge.jsx'
import { formatDateTime } from '../../../utils/format.js'

// The ticket's messages, oldest first. Replies from agents and admins get a tinted background so
// the customer can tell them apart at a glance.
export default function Conversation({ comments }) {
  return (
    <section aria-labelledby="conversation-heading" className="mt-8">
      <h2 id="conversation-heading" className="mb-3 text-lg font-semibold text-slate-900">
        Conversation
      </h2>

      {comments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
          No replies yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {comments.map((c) => {
            const staff = c.authorRole !== 'Customer'
            return (
              <li
                key={c.id}
                className={`rounded-2xl border p-4 shadow-sm ${staff ? 'border-indigo-100 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-900">{c.authorName}</span>
                  {staff && <Badge tone="blue">{c.authorRole}</Badge>}
                  <span className="text-slate-500">{formatDateTime(c.createdAt)}</span>
                </div>
                <p className="text-sm break-words whitespace-pre-wrap text-slate-700">{c.body}</p>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
