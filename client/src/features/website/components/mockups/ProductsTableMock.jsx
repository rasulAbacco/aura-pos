import { LuPlus, LuSearch } from 'react-icons/lu';
import { Pill } from './MockParts.jsx';

const ROWS = [['Repair Shampoo', 'Hair Care', 'HS001', 17, 'In stock', 'green'], ['Treatment Oil', 'Hair Care', 'HS002', 9, 'Low stock', 'amber'], ['Microfoliant', 'Skin Care', 'SK003', 4, 'Reorder', 'rose'], ['Face Mask', 'Skin Care', 'SK004', 28, 'In stock', 'green']];

/** Product stock table (features page, section 05). */
export function ProductsTableMock() {
  return (
    <div className="site-card p-4 text-left text-[11px]">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Products</p><span className="flex items-center gap-1 text-[10px] font-semibold text-mauve"><LuPlus size={11} />Add Product</span></div>
      <div className="mb-3 flex items-center gap-1.5 rounded-md border border-stone-200 px-2 py-1.5 text-stone-400"><LuSearch size={11} />Search products…</div>
      <table className="w-full">
        <thead className="text-left text-[10px] text-stone-500"><tr className="border-b border-stone-100"><th className="py-1 font-medium">Product</th><th className="font-medium">Category</th><th className="font-medium">SKU</th><th className="font-medium">Stock</th><th className="font-medium">Status</th></tr></thead>
        <tbody>{ROWS.map(([n, c, s, q, st, tone]) => <tr key={s} className="border-b border-stone-50 text-ink"><td className="py-2">{n}</td><td>{c}</td><td>{s}</td><td>{q}</td><td><Pill tone={tone}>{st}</Pill></td></tr>)}</tbody>
      </table>
    </div>
  );
}
