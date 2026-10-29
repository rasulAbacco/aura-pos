import { money } from '../../../utils/format.js';
import { Badge, Button } from '../../../components/ui';
import { DataTable } from '../../../components/tables';

export function StockTable({ products, valuationById, canManage, onRestock, onAdjust, onHistory }) {
  const columns = [
    { key: 'name', header: 'Product', render: (p) => <><span className="font-semibold">{p.name}</span>{p.sku && <span className="block text-xs text-stone-500">{p.sku}</span>}</> },
    { key: 'stock', header: 'In stock', align: 'right', render: (p) => <Badge tone={p.lowStock ? 'rose' : 'stone'}>{p.stock}</Badge> },
    { key: 'minStock', header: 'Reorder at', align: 'right' },
    { key: 'value', header: 'Stock value', align: 'right', render: (p) => money(valuationById[p.id]?.value ?? 0) },
    { key: 'actions', header: '', align: 'right', render: (p) => (
      <span className="whitespace-nowrap">
        <Button size="sm" variant="ghost" onClick={() => onHistory(p)}>History</Button>
        {canManage && <><Button size="sm" variant="ghost" onClick={() => onRestock(p)}>Restock</Button><Button size="sm" variant="ghost" onClick={() => onAdjust(p)}>Adjust</Button></>}
      </span>
    ) },
  ];
  return <DataTable columns={columns} rows={products} minWidth={720} empty="No retail products yet. Add them on the Price list page." />;
}
