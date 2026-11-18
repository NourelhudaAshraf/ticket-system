import Badge from './ui/Badge.jsx'

const statuses = {
  Open: { label: 'Open', tone: 'blue' },
  InProgress: { label: 'In Progress', tone: 'yellow' },
  Resolved: { label: 'Resolved', tone: 'green' },
  Closed: { label: 'Closed', tone: 'gray' },
}

// A ticket status from the API ("InProgress") shown as a readable, colored badge ("In Progress").
export default function StatusBadge({ status }) {
  const { label, tone } = statuses[status] ?? { label: status, tone: 'gray' }
  return <Badge tone={tone}>{label}</Badge>
}
