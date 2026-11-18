import Button from './Button.jsx'

// Previous / Next buttons for a paged list, using the API's { page, pageSize, totalCount }.
export default function Pagination({ page, pageSize, totalCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center gap-2 pt-4 md:flex-row md:justify-between">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · {totalCount} total
      </p>
      <div className="flex w-full gap-2 md:w-auto">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
