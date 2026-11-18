import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { verifyEmail } from '../../api/auth.js'
import { useAuth } from '../../auth/useAuth.js'
import Spinner from '../../components/ui/Spinner.jsx'
import AuthCard from './AuthCard.jsx'

const buttonClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-300/40 hover:from-blue-600 hover:to-indigo-600'

// Opened from the emailed link /verify-email?userId=...&token=... It confirms the email as soon as
// the page opens. The link works only once, so the request must not be sent twice.
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  const token = searchParams.get('token')
  const { user, refresh } = useAuth()
  const [state, setState] = useState({ status: 'verifying', message: null })
  const sent = useRef(false)

  useEffect(() => {
    // In development React runs effects twice on purpose; the ref makes sure we call the API once.
    if (!userId || !token || sent.current) return
    sent.current = true

    verifyEmail({ userId, token }).then(
      () => {
        setState({ status: 'done', message: null })
        refresh() // a signed-in customer's banner disappears right away
      },
      (error) => setState({ status: 'failed', message: error.message }),
    )
  }, [userId, token, refresh])

  if (!userId || !token) {
    return (
      <AuthCard title="Link incomplete">
        <p className="text-sm text-slate-600">This link is missing information. Open it again from the email.</p>
      </AuthCard>
    )
  }

  if (state.status === 'verifying') {
    return (
      <AuthCard title="Verifying your email…">
        <div className="flex justify-center py-4 text-indigo-600">
          <Spinner className="size-8" />
        </div>
      </AuthCard>
    )
  }

  const next = user ? { to: '/', label: 'Go to my tickets' } : { to: '/login', label: 'Sign in' }

  if (state.status === 'done') {
    return (
      <AuthCard title="Email verified">
        <p className="mb-4 text-sm text-slate-600">Thank you! You can now submit support tickets.</p>
        <Link to={next.to} className={buttonClass}>
          {next.label}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Could not verify">
      <p className="mb-4 text-sm text-slate-600">
        {state.message} Sign in and use &quot;Resend verification email&quot; to get a new link.
      </p>
      <Link to={next.to} className={buttonClass}>
        {next.label}
      </Link>
    </AuthCard>
  )
}
