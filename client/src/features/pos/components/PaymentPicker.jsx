import { money } from '../../../utils/format.js';
import { cx } from '../../../utils/cx.js';
import { PAYMENT_METHODS, emptyPayment } from '../utils/pos.constants.js';

/** UPI / Card / Cash / Wallet, or several of them (split payment). */
export function PaymentPicker({ payments, setPayments, split, onToggleSplit, due, hasCustomer }) {
  const update = (i, patch) => setPayments(payments.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <fieldset>
      <legend className="mb-1 flex w-full items-center justify-between text-xs font-semibold text-stone-600">
        Payment <button type="button" className="text-rose-700 hover:underline" onClick={onToggleSplit}>{split ? 'Single payment' : 'Split payment'}</button>
      </legend>
      {!split ? (
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHODS.map(([m, label]) => (
            <button key={m} role="radio" aria-checked={payments[0].method === m} disabled={m === 'WALLET' && !hasCustomer}
              onClick={() => update(0, { method: m })}
              className={cx('rounded-lg border py-2 text-xs font-semibold disabled:opacity-40', payments[0].method === m ? 'border-rose-700 bg-rose-700 text-white' : 'border-stone-300 bg-white text-stone-700')}>{label}</button>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {payments.map((p, i) => (
            <div key={i} className="flex gap-1.5">
              <select aria-label="Method" value={p.method} onChange={(e) => update(i, { method: e.target.value })} className="rounded border border-stone-300 bg-white px-1 text-xs">
                {PAYMENT_METHODS.map(([m, label]) => <option key={m} value={m} disabled={m === 'WALLET' && !hasCustomer}>{label}</option>)}
              </select>
              <input aria-label="Amount" type="number" min="0" step="0.01" value={p.amount} onChange={(e) => update(i, { amount: e.target.value })} className="num w-24 rounded border border-stone-300 px-2 py-1 text-right text-xs" />
              <input aria-label="Reference" placeholder="Ref" value={p.reference} onChange={(e) => update(i, { reference: e.target.value })} className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-xs" />
            </div>
          ))}
          <div className="flex justify-between text-xs">
            {payments.length < 4 && <button className="font-semibold text-rose-700" onClick={() => setPayments([...payments, emptyPayment('CASH', due > 0 ? due.toFixed(2) : '')])}>+ Add payment</button>}
            <span className={cx('num font-semibold', Math.abs(due) > 0.004 ? 'text-rose-700' : 'text-ledger')}>{Math.abs(due) > 0.004 ? `${due > 0 ? 'Remaining' : 'Over by'} ${money(Math.abs(due))}` : 'Fully allocated'}</span>
          </div>
        </div>
      )}
    </fieldset>
  );
}
