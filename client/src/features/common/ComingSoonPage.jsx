import MessagePage from './MessagePage.jsx'

// Temporary page for routes whose screens are built in later tasks (tickets, queue, admin).
// Each route in routes.jsx swaps it for the real page when that task is done.
export default function ComingSoonPage({ title }) {
  return <MessagePage icon="✦" title={title} message="This page is coming soon." showHomeLink={false} />
}
