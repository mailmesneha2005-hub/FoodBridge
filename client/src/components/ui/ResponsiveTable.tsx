import type { ReactNode } from 'react'

export type TableColumn<T> = { key: string; header: string; cell: (row: T) => ReactNode }

export function ResponsiveTable<T>({ columns, rows, rowKey, empty }: { columns: TableColumn<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode }) {
  if (rows.length === 0) return <div className="p-5">{empty ?? <p className="text-sm text-muted">Nothing to show yet.</p>}</div>
  return <div className="overflow-hidden rounded-2xl border border-[#e8eee9] bg-white">
    <div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-[#e8eee9] bg-[#fbfcfb]">{columns.map(column => <th scope="col" key={column.key} className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted">{column.header}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ee]">{rows.map(row => <tr key={rowKey(row)} className="transition-colors hover:bg-[#fbfcfb]">{columns.map(column => <td key={column.key} className="px-5 py-4 text-sm text-ink">{column.cell(row)}</td>)}</tr>)}</tbody></table></div>
    <div className="divide-y divide-[#edf1ee] md:hidden">{rows.map(row => <article key={rowKey(row)} className="space-y-3 p-4"><h3 className="font-bold text-ink">{columns[0]?.cell(row)}</h3><dl className="grid grid-cols-2 gap-x-4 gap-y-3">{columns.slice(1).map(column => <div key={column.key}><dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{column.header}</dt><dd className="mt-1 text-sm text-ink">{column.cell(row)}</dd></div>)}</dl></article>)}</div>
  </div>
}
