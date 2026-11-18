// Small display helpers shared by the ticket pages.

// "4 Nov 2026, 14:05" in the user's own time zone (the API sends UTC).
export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
