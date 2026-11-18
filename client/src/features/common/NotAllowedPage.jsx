import MessagePage from './MessagePage.jsx'

// Shown by ProtectedRoute when a signed-in user opens a page meant for another role.
export default function NotAllowedPage() {
  return <MessagePage icon="!" title="Not allowed" message="Your account can't open this page." />
}
