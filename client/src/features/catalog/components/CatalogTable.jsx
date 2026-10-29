import { money } from '../../../utils/format.js';
import { Badge, Button } from '../../../components/ui';
import { cx } from '../../../utils/cx.js';

export function CatalogTable({ items, canBill, canEdit, canRestock, onBill, onEdit, onRestock, onArchive }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-stone-50 text-left text-xs text-stone-500"><tr><th className="px-4 py-2">Name</th><th className="px-4">Category</th><th className="px-4 text-right">Price</th><th className="px-4 text-right">GST</th><th className="px-4">Duration / stock</th><th className="px-4" /></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((i) => (
            <tr key={i.id} className={cx(i.archivedAt && 'text-stone-400')}>
              <td className="px-4 py-2.5 font-semibold">{i.name}{i.archivedAt && <span className="ml-2"><Badge>Archived</Badge></span>}</td>
              <td className="px-4 text-stone-600">{i.category.name}</td>
              <td className="num px-4 text-right">{money(i.price)}</td>
              <td className="num px-4 text-right">{Number(i.taxRate)}%</td>
              <td className="px-4">{i.type === 'SERVICE' ? `${i.durationMin} min` : <Badge tone={i.lowStock ? 'rose' : 'stone'}>{i.stock} in stock{i.lowStock ? ' — reorder' : ''}</Badge>}</td>
              <td className="space-x-1 whitespace-nowrap px-4 text-right">
                {!i.archivedAt && canBill && <Button size="sm" variant="ghost" onClick={() => onBill(i)}>Bill</Button>}
                {i.type === 'PRODUCT' && !i.archivedAt && canRestock && <Button size="sm" variant="ghost" onClick={() => onRestock(i)}>Restock</Button>}
                {canEdit && !i.archivedAt && <Button size="sm" variant="ghost" onClick={() => onEdit(i)}>Edit</Button>}
                {canEdit && <Button size="sm" variant="ghost" onClick={() => onArchive(i)}>{i.archivedAt ? 'Restore' : 'Archive'}</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
