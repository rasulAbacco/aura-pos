/** Inventory: stock on hand and value, restock / adjust with reasons, movement history, suppliers. */
import { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { money } from '../../utils/format.js';
import { cx } from '../../utils/cx.js';
import { PageHeader, ErrorNote, Skeleton } from '../../components/ui';
import { useStock } from './hooks/useStock.js';
import { StockTable } from './components/StockTable.jsx';
import { RestockModal } from './components/RestockModal.jsx';
import { AdjustStockModal } from './components/AdjustStockModal.jsx';
import { MovementsModal } from './components/MovementsModal.jsx';
import { SuppliersPanel } from './components/SuppliersPanel.jsx';

export default function InventoryPage() {
  const { can, writable } = useAuth();
  const { products, low, valuation, reload } = useStock();
  const [tab, setTab] = useState('stock');
  const [modal, setModal] = useState(null);
  const canManage = can('inventory.manage') && writable;
  const valuationById = useMemo(() => Object.fromEntries((valuation.data?.items ?? []).map((v) => [v.id, v])), [valuation.data]);
  const done = () => { setModal(null); reload(); };

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Inventory" subtitle="Stock on hand at this branch. Every change is recorded with a reason." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Stock value (at cost)</p><p className="num mt-1 text-2xl font-extrabold">{money(valuation.data?.total ?? 0)}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Products to reorder</p><p className={cx('num mt-1 text-2xl font-extrabold', low.data?.length && 'text-rose-800')}>{low.data?.length ?? 0}</p></div>
        <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Products tracked</p><p className="num mt-1 text-2xl font-extrabold">{products.data?.length ?? 0}</p></div>
      </div>
      {low.data?.length > 0 && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Reorder soon</p>
          <ul className="mt-1 space-y-0.5">{low.data.map((i) => <li key={i.id}>{i.name}: {i.stock} left, suggest ordering {i.suggestedReorder}</li>)}</ul>
        </div>
      )}
      <div className="mb-4 flex gap-1 rounded-lg bg-stone-200/60 p-1 text-sm font-semibold sm:w-fit" role="tablist">
        {[['stock', 'Stock'], ['suppliers', 'Suppliers']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('rounded-md px-4 py-1.5', tab === k ? 'bg-white shadow-sm' : 'text-stone-600')}>{l}</button>)}
      </div>
      {tab === 'stock' && (products.error ? <ErrorNote onRetry={reload}>{products.error}</ErrorNote> : products.loading ? <Skeleton /> : (
        <StockTable products={products.data} valuationById={valuationById} canManage={canManage}
          onRestock={(p) => setModal({ kind: 'restock', item: p })} onAdjust={(p) => setModal({ kind: 'adjust', item: p })} onHistory={(p) => setModal({ kind: 'history', item: p })} />
      ))}
      {tab === 'suppliers' && <SuppliersPanel canManage={canManage} />}
      {modal?.kind === 'restock' && <RestockModal item={modal.item} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.kind === 'adjust' && <AdjustStockModal item={modal.item} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.kind === 'history' && <MovementsModal item={modal.item} onClose={() => setModal(null)} />}
    </div>
  );
}
