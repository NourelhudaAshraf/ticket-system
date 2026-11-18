import { useState } from 'react'
import { resendVerification } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'
import Button from './ui/Button.jsx'
import { useToast } from './ui/useToast.js'

// Shown to a customer who has not verified their email yet (they can't submit tickets until they do).
// Renders nothing for everyone else.
export default function UnverifiedBanner() {
  const { user } = useAuth()
  const toast = useToast()
  const [sending, setSending] = useState(false)

  if (!user || user.role !== 'Customer' || user.emailVerified) return null

  async function resend() {
    setSending(true)
    try {
      await resendVerification(user.email)
      toast.success(`A new verification link was sent to ${user.email}.`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div role="status" className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-amber-900">
        <strong>Verify your email to submit tickets.</strong> We sent a link to {user.email}.
      </p>
      <Button variant="secondary" loading={sending} onClick={resend} className="shrink-0">
        Resend verification email
      </Button>
    </div>
  )
}
