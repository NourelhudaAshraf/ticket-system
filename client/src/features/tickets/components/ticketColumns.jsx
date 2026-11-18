import PriorityBadge from '../../../components/PriorityBadge.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { formatDateTime } from '../../../utils/format.js'

// Table columns shared by the ticket lists; each page picks the ones it needs.
export const ticketColumns = {
  title: { key: 'title', header: 'Title', render: (t) => <span className="font-medium text-slate-900">{t.title}</span> },
  customer: { key: 'customerName', header: 'Customer' },
  category: { key: 'categoryName', header: 'Category' },
  assignedTo: { key: 'assignedAgentName', header: 'Assigned to' },
  status: { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  priority: { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
  updated: { key: 'updatedAt', header: 'Updated', render: (t) => formatDateTime(t.updatedAt) },
}
