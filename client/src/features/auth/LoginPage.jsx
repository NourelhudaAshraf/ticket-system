import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import PasswordInput from '../../components/ui/PasswordInput.jsx'
import { useToast } from '../../components/ui/useToast.js'
import AuthCard from './AuthCard.jsx'

// Wrapped in GuestRoute (routes.jsx): once signed in, GuestRoute sends the user to their role's
// home page (My tickets / My queue / Dashboard).
export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit({ email, password }) {
    try {
      await login(email, password) // sets user → GuestRoute redirects
    } catch (error) {
      toast.error(error.message) // e.g. "Email or password is incorrect."
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue to your tickets.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Enter your email.' })}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Enter your password.' })}
        />

        <Button type="submit" loading={isSubmitting} className="md:w-full">
          Sign in
        </Button>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-800">
            Forgot your password?
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-800">
            Create an account
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
