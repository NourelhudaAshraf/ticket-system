import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { register as registerAccount, resendVerification } from '../../api/auth.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import PasswordInput from '../../components/ui/PasswordInput.jsx'
import { useToast } from '../../components/ui/useToast.js'
import AuthCard from './AuthCard.jsx'

const linkClass = 'font-medium text-indigo-600 hover:text-indigo-800'

// Self-service sign-up (always a Customer). Same rules as the API: name 1–100 characters, a valid
// email, password ≥ 8 characters with a letter and a digit. Afterwards the user must click the
// emailed link before they can submit tickets.
export default function RegisterPage() {
  const toast = useToast()
  const [sentTo, setSentTo] = useState(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [resending, setResending] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit({ name, email, password }) {
    setEmailTaken(false)
    try {
      await registerAccount({ name, email, password })
      setSentTo(email)
    } catch (error) {
      if (error.code === 'email_taken') {
        setError('email', { message: error.message })
        setEmailTaken(true)
        return
      }
      // Field problems go under their fields; anything else in a toast.
      const fields = Object.entries(error.errors).filter(([field]) => ['name', 'email', 'password'].includes(field))
      if (fields.length) fields.forEach(([field, messages]) => setError(field, { message: messages[0] }))
      else toast.error(error.message)
    }
  }

  async function sendAgain() {
    setResending(true)
    try {
      await resendVerification(sentTo)
      toast.success('A new link was sent.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setResending(false)
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle="One more step to finish your account.">
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            We sent a verification link to <strong>{sentTo}</strong>. Open it to confirm your email; the link is valid
            for 24 hours.
          </p>
          <p>Didn&apos;t get it? Check your spam folder, or send it again.</p>
          <Button variant="secondary" loading={resending} onClick={sendAgain} className="md:w-full">
            Send again
          </Button>
          <p className="text-center">
            <Link to="/login" className={linkClass}>
              Go to sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Create your account" subtitle="Submit and track your support tickets.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            validate: (value) => value.trim().length > 0 || 'Enter your name.',
            maxLength: { value: 100, message: 'Use at most 100 characters.' },
          })}
        />
        <div>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Enter your email.',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
            })}
          />
          {emailTaken && (
            <p className="mt-1 text-sm text-slate-600">
              Is it yours?{' '}
              <Link to="/forgot-password" className={linkClass}>
                Reset your password
              </Link>
            </p>
          )}
        </div>
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Choose a password.',
            minLength: { value: 8, message: 'Use at least 8 characters.' },
            pattern: { value: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Use at least one letter and one digit.' },
          })}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            validate: (value) => value === getValues('password') || 'The passwords do not match.',
          })}
        />

        <Button type="submit" loading={isSubmitting} className="md:w-full">
          Create account
        </Button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className={linkClass}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
