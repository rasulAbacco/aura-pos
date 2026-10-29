import { FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi';
import { money } from '../../../utils/format.js';
import { Badge } from '../../../components/ui';

/** One line on the bill: stylist, quantity, price (editable only with permission) and its discount. */
export function CartLine({ line: l, staff, quoteLine, canEditPrice, onChange }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight">{l.name}</span>
        <button onClick={() => onChange({ quantity: 0 })} className="text-stone-400 hover:text-rose-700" aria-label={`Remove ${l.name}`}><FiTrash2 /></button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {l.type !== 'MEMBERSHIP' ? (
          <select aria-label="Stylist" value={l.staffId ?? ''} onChange={(e) => onChange({ staffId: e.target.value })} className="max-w-[9rem] rounded border border-stone-300 bg-white px-1.5 py-1 text-xs">
            <option value="">No stylist</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : <Badge tone="rose">Enrols client</Badge>}
        <div className="flex items-center gap-2">
          {l.type !== 'MEMBERSHIP' && (
            <div className="flex items-center rounded border border-stone-300 bg-white">
              <button className="px-1.5 py-1" onClick={() => onChange({ quantity: l.quantity - 1 })} aria-label="Decrease"><FiMinus size={12} /></button>
              <span className="num w-6 text-center text-xs font-semibold">{l.quantity}</span>
              <button className="px-1.5 py-1" onClick={() => onChange({ quantity: l.quantity + 1 })} aria-label="Increase"><FiPlus size={12} /></button>
            </div>
          )}
          {canEditPrice && l.type !== 'MEMBERSHIP' ? (
            <input aria-label="Unit price" type="number" min="0" step="1" value={l.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value })} className="num w-20 rounded border border-stone-300 px-1.5 py-1 text-right text-xs font-semibold" />
          ) : <span className="num text-xs font-semibold">{money(l.unitPrice)}</span>}
        </div>
      </div>
      {quoteLine && Number(quoteLine.discountAmount) > 0 && <p className="num mt-1 text-right text-xs text-ledger">−{money(quoteLine.discountAmount)} discount</p>}
    </div>
  );
}
