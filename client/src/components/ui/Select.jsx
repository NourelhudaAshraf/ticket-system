import { Children, useCallback, useEffect, useId, useRef, useState } from 'react'
import FieldError from './FieldError.jsx'
import { fieldClasses } from './Input.jsx'

// A labeled dropdown with a custom, rounded options list (a native <select> list is drawn by the
// browser and can't be styled). Used exactly like a <select>:
//
//   <Select label="Priority" {...register('priority')}>            ← react-hook-form
//   <Select label="Status" value={s} onChange={(e) => setS(e.target.value)}>  ← controlled
//     <option value="Low">Low</option> ...
//   </Select>
//
// How: a hidden native <select> still holds the value (so forms and react-hook-form keep working);
// the visible button + list just show it and, on pick, set the hidden select and fire its "change".
// Keyboard: ↑/↓ move, Enter/Space pick, Home/End jump, Esc closes, typing a letter jumps to it.
export default function Select({ label, error, id, className = '', children, ref, value, defaultValue, onChange, onBlur, name, disabled, ...props }) {
  const generatedId = useId()
  const buttonId = id ?? generatedId
  const listId = `${buttonId}-list`
  const errorId = `${buttonId}-error`

  const selectRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [current, setCurrent] = useState(value ?? defaultValue ?? '')

  // <option value="x">Label</option> children → [{ value, label, disabled }]
  const options = Children.toArray(children).map((child) => ({
    value: String(child.props.value ?? ''),
    label: child.props.children,
    disabled: !!child.props.disabled,
  }))

  const selectedValue = value !== undefined ? String(value) : current
  const selected = options.find((o) => o.value === selectedValue) ?? options[0]

  // Pass the hidden <select> to react-hook-form's ref, then read its value: react-hook-form writes
  // the form's defaultValues into the element when it receives the ref.
  const setSelectRef = useCallback(
    (node) => {
      selectRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      if (node) setCurrent(node.value)
    },
    [ref],
  )

  function pick(option) {
    if (option.disabled) return
    const node = selectRef.current
    node.value = option.value
    setCurrent(option.value)
    // React treats a bubbling "change" on a <select> as its onChange, so register/onChange both run.
    node.dispatchEvent(new Event('change', { bubbles: true }))
    close()
  }

  function openList() {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((o) => o.value === selectedValue)))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  // Move focus into the list when it opens, and keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function move(from, step) {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + step * i + options.length) % options.length
      if (!options[next].disabled) return next
    }
    return from
  }

  function onListKeyDown(event) {
    const keys = {
      ArrowDown: () => setActive((a) => move(a, 1)),
      ArrowUp: () => setActive((a) => move(a, -1)),
      Home: () => setActive(move(-1, 1)),
      End: () => setActive(move(options.length, -1)),
      Enter: () => pick(options[active]),
      ' ': () => pick(options[active]),
      Escape: close,
      Tab: () => setOpen(false),
    }
    if (keys[event.key]) {
      if (event.key !== 'Tab') event.preventDefault()
      keys[event.key]()
      return
    }
    // Typing a letter jumps to the next option starting with it.
    if (event.key.length === 1) {
      const letter = event.key.toLowerCase()
      const start = active + 1
      for (let i = 0; i < options.length; i++) {
        const index = (start + i) % options.length
        if (String(options[index].label).toLowerCase().startsWith(letter) && !options[index].disabled) {
          setActive(index)
          break
        }
      }
    }
  }

  function onButtonKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openList()
    }
  }

  return (
    <div className={className}>
      <label htmlFor={buttonId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        {/* The real form field, hidden: holds the value for react-hook-form and form submits. */}
        <select
          ref={setSelectRef}
          name={name}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={(event) => {
            setCurrent(event.target.value)
            onChange?.(event)
          }}
          onBlur={onBlur}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          {...props}
        >
          {children}
        </select>

        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onButtonKeyDown}
          className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 pr-3 text-left hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${fieldClasses} ${open ? 'border-indigo-500 ring-[0.25rem] ring-indigo-100' : ''}`}
        >
          <span className={`truncate ${selected?.value === '' ? 'text-slate-400' : ''}`}>{selected?.label}</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-500' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={buttonId}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onListKeyDown}
            // Close when focus leaves the list (click outside, Tab away).
            onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
            className="dropdown-in absolute inset-x-0 top-full z-30 mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/70 focus:outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue
              const isActive = index === active
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => !option.disabled && setActive(index)}
                  // mousedown (not click) so the list doesn't lose focus and close first.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    pick(option)
                  }}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm transition-colors ${
                    option.disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : isActive
                        ? 'bg-indigo-50 text-indigo-900'
                        : 'text-slate-700'
                  } ${isSelected ? 'font-semibold text-indigo-700' : ''} ${option.value === '' && !isSelected ? 'text-slate-400' : ''}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 shrink-0 text-indigo-600">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <FieldError id={errorId} message={error} />
    </div>
  )
}
