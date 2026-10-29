import { cx } from '../../utils/cx.js';

/**
 * Simple responsive table. columns: [{ key, header, align?: 'right', render?: (row) => node, className? }]
 * Scrolls horizontally on narrow screens instead of squashing columns.
 */
export function DataTable({ columns, rows, rowKey = (r) => r.id, minWidth = 640, empty = 'Nothing to show.' }) {
  if (!rows?.length) return <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-stone-50 text-left text-xs text-stone-500">
          <tr>{columns.map((c) => <th key={c.key} className={cx('px-4 py-2 font-semibold', c.align === 'right' && 'text-right')}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => <td key={c.key} className={cx('px-4 py-2.5', c.align === 'right' && 'num text-right', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
