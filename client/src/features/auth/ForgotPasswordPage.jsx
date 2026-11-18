import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { forgotPassword } from '../../api/auth.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import { useToast } from '../../components/ui/useToast.js'
import AuthCard from './AuthCard.jsx'

// Asks for an email and requests a reset link. The page never says whether the email has an
// account (the API answers the same either way), so it always shows the same confirmation.
export default function ForgotPasswordPage() {
  const toast = useToast()
  const [sentTo, setSentTo] = useState(null)
  const [resending, setResending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function send(email) {
    try {
      await forgotPassword(email)
      setSentTo(email)
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function sendAgain() {
    setResending(true)
    await send(sentTo)
    setResending(false)
    toast.success('A new link was sent.')
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle="Your reset link is on its way.">
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            If an account exists for <strong>{sentTo}</strong>, we sent a link to reset your password. The link is valid
            for 1 hour.
          </p>
          <p>Didn&apos;t get it? Check your spam folder, or send it again.</p>
          <Button variant="secondary" loading={resending} onClick={sendAgain} className="md:w-full">
            Send again
          </Button>
          <p className="text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <form onSubmit={handleSubmit(({ email }) => send(email))} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Enter your email.' })}
        />
        <Button type="submit" loading={isSubmitting} className="md:w-full">
          Send reset link
        </Button>
        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
