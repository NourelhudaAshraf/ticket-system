// A list of rows shown two ways: a normal table from md (48rem) up, and one card per row on phones
// (a table would need sideways scrolling there).
//
// columns: [{ key, header, render?(row) }] — without `render`, the cell shows row[key].
// onRowClick (optional): makes each row clickable, e.g. to open a ticket.
export default function Table({ columns, rows, rowKey = (row) => row.id, onRowClick }) {
  const cell = (column, row) => (column.render ? column.render(row) : row[column.key])
  const clickable = onRowClick ? 'cursor-pointer transition-colors hover:bg-indigo-50/50' : ''

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-5 py-3">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className={clickable} onClick={onRowClick && (() => onRowClick(row))}>
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-3.5 align-top text-slate-700">
                    {cell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${clickable}`}
            onClick={onRowClick && (() => onRowClick(row))}
          >
            <dl className="space-y-1.5 text-sm">
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{column.header}</dt>
                  <dd className="text-right text-slate-900">{cell(column, row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
