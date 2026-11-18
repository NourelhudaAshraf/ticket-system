import Badge from './ui/Badge.jsx'

const tones = { Low: 'gray', Medium: 'blue', High: 'orange', Urgent: 'red' }

// A ticket priority as a colored badge; colors get stronger as priority rises.
export default function PriorityBadge({ priority }) {
  return <Badge tone={tones[priority] ?? 'gray'}>{priority}</Badge>
}
