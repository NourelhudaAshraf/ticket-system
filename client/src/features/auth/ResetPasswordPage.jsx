import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { resetPassword } from '../../api/auth.js'
import Button from '../../components/ui/Button.jsx'
import PasswordInput from '../../components/ui/PasswordInput.jsx'
import { useToast } from '../../components/ui/useToast.js'
import AuthCard from './AuthCard.jsx'

// Opened from the emailed link /reset-password?userId=...&token=... (password reset or admin
// invitation). Sets a new password; the same rules as the API: ≥ 8 characters, a letter and a digit.
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  const token = searchParams.get('token')
  const [done, setDone] = useState(false)
  const toast = useToast()
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  if (!userId || !token) {
    return (
      <AuthCard title="Link incomplete">
        <p className="text-sm text-slate-600">
          This link is missing information. Open it again from the email, or{' '}
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-800">
            request a new link
          </Link>
          .
        </p>
      </AuthCard>
    )
  }

  if (done) {
    return (
      <AuthCard title="Password saved">
        <p className="mb-4 text-sm text-slate-600">Your new password is set. You can sign in with it now.</p>
        <Link
          to="/login"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-300/40 hover:from-blue-600 hover:to-indigo-600"
        >
          Sign in
        </Link>
      </AuthCard>
    )
  }

  async function onSubmit({ newPassword }) {
    try {
      await resetPassword({ userId, token, newPassword })
      setDone(true)
    } catch (error) {
      // A field problem goes under the field; anything else (e.g. expired link) in a toast.
      if (error.errors.newPassword) setError('newPassword', { message: error.errors.newPassword[0] })
      else toast.error(error.message)
    }
  }

  return (
    <AuthCard title="Choose a new password" subtitle="At least 8 characters, with a letter and a digit.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword', {
            required: 'Enter a new password.',
            minLength: { value: 8, message: 'Use at least 8 characters.' },
            pattern: { value: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Use at least one letter and one digit.' },
          })}
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            validate: (value) => value === getValues('newPassword') || 'The passwords do not match.',
          })}
        />

        <Button type="submit" loading={isSubmitting} className="md:w-full">
          Save password
        </Button>

        <p className="text-center text-sm text-slate-500">
          Link expired?{' '}
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-800">
            Request a new link
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
