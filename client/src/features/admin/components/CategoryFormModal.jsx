import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { listAgents } from '../../../api/agents.js'
import { createCategory, updateCategory } from '../../../api/categories.js'
import Button from '../../../components/ui/Button.jsx'
import Input from '../../../components/ui/Input.jsx'
import Modal from '../../../components/ui/Modal.jsx'
import Select from '../../../components/ui/Select.jsx'
import { useToast } from '../../../components/ui/useToast.js'
import { useApi } from '../../../hooks/useApi.js'

// One dialog for "New category" (category = null) and "Edit category" (rename / change default agent).
// The default agent is required; saving adds that agent to the category.
// Default-agent choices: for a new category, every agent (it has no members yet); when editing, only
// the agents who already belong to this category. To pick someone else, add the category to them on
// the Users page first.
export default function CategoryFormModal({ open, category, onClose, onSaved }) {
  const toast = useToast()
  // GET /agents?categoryId=… — reloads each time the dialog opens, so membership changes show up.
  const agentsApi = useApi(() => (open ? listAgents(category?.id) : Promise.resolve(null)), [open, category?.id])
  const agents = agentsApi.data ?? []
  const editing = !!category
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  // Keeps the Default agent dropdown's label in sync when reset() fills the form.
  const defaultAgentId = useWatch({ control, name: 'defaultAgentId' })

  // Values waiting for "Replace default agent?" to be confirmed (null = no confirmation open).
  const [pending, setPending] = useState(null)

  // Fill the form each time the dialog opens.
  useEffect(() => {
    if (open)
      reset({
        name: category?.name ?? '',
        defaultAgentId: category?.defaultAgentId ?? '',
      })
  }, [open, category, reset])

  const agentName = (id) => agents.find((a) => a.id === id)?.name ?? 'the selected agent'

  // Editing a category that already has a default agent and picking someone else: ask first.
  function onSubmit(values) {
    const replacing = editing && category.defaultAgentId && values.defaultAgentId !== category.defaultAgentId
    if (replacing) setPending(values)
    else return save(values)
  }

  // On success the edit dialog closes too (onSaved); on an error the message shows in the edit form.
  const [saving, setSaving] = useState(false)
  async function confirmReplace() {
    setSaving(true)
    await save(pending)
    setSaving(false)
    setPending(null)
  }

  async function save(values) {
    const body = {
      name: values.name.trim(),
      defaultAgentId: values.defaultAgentId,
    }
    try {
      const saved = editing ? await updateCategory(category.id, body) : await createCategory(body)
      toast.success(editing ? 'Category saved.' : `Category “${saved.name}” created.`)
      onSaved(saved)
    } catch (error) {
      if (error.code === 'name_taken') return setError('name', { message: error.message })
      if (error.code === 'agent_not_eligible')
        return setError('defaultAgentId', {
          message: 'Choose a user with the Agent role.',
        })
      const fields = Object.entries(error.errors).filter(([field]) => ['name', 'defaultAgentId'].includes(field))
      if (fields.length) fields.forEach(([field, messages]) => setError(field, { message: messages[0] }))
      else toast.error(error.message)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editing ? `Edit ${category.name}` : 'New category'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" loading={isSubmitting}>
              {editing ? 'Save' : 'Create category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="Name"
            error={errors.name?.message}
            {...register('name', {
              validate: (value) => value.trim().length > 0 || 'Enter a name.',
              maxLength: { value: 60, message: 'Use at most 60 characters.' },
            })}
          />

          <div>
            <Select
              label="Default agent"
              value={defaultAgentId ?? ''}
              error={errors.defaultAgentId?.message}
              {...register('defaultAgentId', {
                required: 'Choose a default agent.',
              })}
            >
              <option value="">Choose an agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            {editing && category.defaultAgentName && (
              <p className="mt-1 text-xs text-slate-500">
                Current default agent: <strong className="font-medium text-slate-700">{category.defaultAgentName}</strong>
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {editing
                ? 'Only agents of this category are listed. To choose someone else, add this category to them on the Users page first.'
                : 'New tickets in this category are assigned to this agent, who is added to the category.'}
            </p>
            {agentsApi.data && agents.length === 0 && (
              <p className="mt-1 text-sm text-amber-700">No agents yet — invite one on the Users page first.</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Opens on top of the edit dialog (the browser stacks <dialog>s opened with showModal()). */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Replace default agent?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button loading={isSubmitting || saving} onClick={confirmReplace}>
              Replace
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          <strong>{category?.defaultAgentName ?? 'Another agent'}</strong> is currently the default agent of <strong>{category?.name}</strong>. New tickets in
          this category will go to <strong>{pending && agentName(pending.defaultAgentId)}</strong> instead.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Existing tickets keep their assigned agent, and {category?.defaultAgentName ?? 'the current default agent'} stays a member of this category (you can
          remove them on the Users page).
        </p>
      </Modal>
    </>
  )
}
