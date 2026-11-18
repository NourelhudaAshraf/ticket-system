import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { listCategories } from '../../api/categories.js'
import { createTicket } from '../../api/tickets.js'
import { useAuth } from '../../auth/useAuth.js'
import UnverifiedBanner from '../../components/UnverifiedBanner.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import LinkButton from '../../components/ui/LinkButton.jsx'
import Select from '../../components/ui/Select.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { useApi } from '../../hooks/useApi.js'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const FORM_FIELDS = ['title', 'description', 'categoryId', 'priority', 'relatedTicketId']

// /tickets/new?relatedTo=<id> — submit a ticket, optionally as a follow-up to an earlier one.
// Same limits as the API: title ≤ 150, description ≤ 5,000, a category.
// On an error the typed values stay in the form (react-hook-form keeps them).
export default function NewTicketPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const relatedTo = searchParams.get('relatedTo')
  const categories = useApi(listCategories)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { title: '', description: '', categoryId: '', priority: 'Medium' } })

  const canSubmit = user.emailVerified

  async function onSubmit(values) {
    try {
      const ticket = await createTicket({ ...values, relatedTicketId: relatedTo })
      toast.success('Your ticket was submitted.')
      navigate(`/tickets/${ticket.id}`)
    } catch (error) {
      // Field errors next to their fields; the rest in a toast.
      let shown = false
      for (const [field, messages] of Object.entries(error.errors)) {
        if (FORM_FIELDS.includes(field)) {
          setError(field === 'relatedTicketId' ? 'root' : field, { message: messages[0] })
          shown = true
        }
      }
      if (error.code === 'category_deleted') {
        setError('categoryId', { message: error.message })
      } else if (!shown) {
        toast.error(error.message)
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UnverifiedBanner />

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">New ticket</h1>

      {relatedTo && (
        <p className="mb-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Follow-up to ticket{' '}
          <Link to={`/tickets/${relatedTo}`} className="font-mono font-medium underline">
            {relatedTo}
          </Link>
        </p>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      >
        <Input
          label="Title"
          maxLength={150}
          error={errors.title?.message}
          {...register('title', {
            validate: (value) => value.trim().length > 0 || 'Enter a title.',
            maxLength: { value: 150, message: 'Use at most 150 characters.' },
          })}
        />

        <Textarea
          label="Description"
          rows={8}
          maxLength={5000}
          error={errors.description?.message}
          {...register('description', {
            validate: (value) => value.trim().length > 0 || 'Describe the problem.',
            maxLength: { value: 5000, message: 'Use at most 5,000 characters.' },
          })}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Select
            label="Category"
            disabled={categories.loading}
            error={errors.categoryId?.message}
            {...register('categoryId', { required: 'Choose a category.' })}
          >
            <option value="">{categories.loading ? 'Loading…' : 'Choose a category'}</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select label="Priority" error={errors.priority?.message} {...register('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        {categories.error && <p className="text-sm text-red-600">{categories.error.message}</p>}

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <LinkButton to="/tickets" variant="secondary">
            Cancel
          </LinkButton>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            Submit ticket
          </Button>
        </div>
      </form>
    </div>
  )
}
