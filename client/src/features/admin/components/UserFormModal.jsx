import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { createUser, updateUser } from '../../../api/users.js'
import Button from '../../../components/ui/Button.jsx'
import Input from '../../../components/ui/Input.jsx'
import Modal from '../../../components/ui/Modal.jsx'
import Select from '../../../components/ui/Select.jsx'
import { useToast } from '../../../components/ui/useToast.js'

const ROLES = ['Customer', 'Agent', 'Admin']

// One dialog for both "Invite agent" (user = null) and "Edit user" (user = the row being edited).
// Inviting creates an Agent without a password; they get an email to choose one (valid 72 h).
// Editing changes name, role, and categories (the email can't change). Only agents have categories.
export default function UserFormModal({ open, user, categories, onClose, onSaved }) {
  const toast = useToast()
  const editing = !!user
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  // Fill the form each time the dialog opens (empty for an invite, the user's values for an edit).
  useEffect(() => {
    if (open) {
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'Agent',
        categoryIds: user?.categoryIds ?? [],
      })
    }
  }, [open, user, reset])

  // The current role choice (shows or hides the categories, and keeps the Role dropdown's label in sync).
  const role = useWatch({ control, name: 'role' })

  async function onSubmit(values) {
    // Customers and admins never have categories.
    const categoryIds = values.role === 'Agent' ? (values.categoryIds || []) : []
    try {
      const saved = editing
        ? await updateUser(user.id, { name: values.name, role: values.role, categoryIds })
        : await createUser({ name: values.name, email: values.email, role: 'Agent', categoryIds })
      toast.success(editing ? 'User saved.' : `Invitation sent to ${saved.email}.`)
      onSaved(saved)
    } catch (error) {
      if (error.code === 'email_taken') return setError('email', { message: error.message })
      // e.g. "This agent is a category's default agent; choose another default agent first."
      if (error.code === 'agent_is_default') return setError('root', { message: error.message })
      const fields = Object.entries(error.errors).filter(([field]) => ['name', 'email', 'role', 'categoryIds'].includes(field))
      if (fields.length) fields.forEach(([field, messages]) => setError(field, { message: messages[0] }))
      else toast.error(error.message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${user.name}` : 'Invite agent'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={isSubmitting}>
            {editing ? 'Save' : 'Send invitation'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Name"
          error={errors.name?.message}
          {...register('name', {
            validate: (value) => value.trim().length > 0 || 'Enter a name.',
            maxLength: { value: 100, message: 'Use at most 100 characters.' },
          })}
        />

        {editing ? (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
            <p className="text-sm text-slate-600">{user.email}</p>
          </div>
        ) : (
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Enter an email.',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
            })}
          />
        )}

        {editing && (
          <Select label="Role" value={role ?? ''} error={errors.role?.message} {...register('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}

        {role === 'Agent' && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Categories</legend>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-500">No categories yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <label
                    key={c.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 has-checked:border-indigo-300 has-checked:bg-indigo-50"
                  >
                    <input type="checkbox" value={c.id} className="size-4 accent-indigo-600" {...register('categoryIds')} />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Optional. Agents only see tickets in their categories and tickets assigned to them.</p>
            {errors.categoryIds && <p className="mt-1 text-sm text-red-600">{errors.categoryIds.message}</p>}
          </fieldset>
        )}

        {editing && user.role === 'Agent' && role !== 'Agent' && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {user.name} will stop being an agent and leave all their categories.
          </p>
        )}

        {errors.root && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.root.message}</p>}
      </form>
    </Modal>
  )
}
