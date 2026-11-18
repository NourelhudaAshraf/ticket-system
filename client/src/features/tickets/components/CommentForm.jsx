import { useForm } from 'react-hook-form'
import { addComment } from '../../../api/tickets.js'
import Button from '../../../components/ui/Button.jsx'
import Textarea from '../../../components/ui/Textarea.jsx'
import { useToast } from '../../../components/ui/useToast.js'

// Reply box under the conversation (only rendered when permissions.canComment). After a successful
// send it clears itself and calls onAdded so the page reloads the ticket.
export default function CommentForm({ ticketId, onAdded }) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { body: '' } })

  async function onSubmit({ body }) {
    try {
      await addComment(ticketId, body)
      reset()
      onAdded()
    } catch (error) {
      if (error.errors.body) setError('body', { message: error.errors.body[0] })
      else toast.error(error.message) // e.g. the ticket was resolved meanwhile
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <Textarea
        label="Reply"
        rows={4}
        maxLength={5000}
        error={errors.body?.message}
        {...register('body', {
          validate: (value) => value.trim().length > 0 || 'Write a message.',
          maxLength: { value: 5000, message: 'Use at most 5,000 characters.' },
        })}
      />
      <div className="flex md:justify-end">
        <Button type="submit" loading={isSubmitting}>
          Send reply
        </Button>
      </div>
    </form>
  )
}
