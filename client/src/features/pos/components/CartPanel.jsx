import { FiPause, FiEdit3 } from 'react-icons/fi';
import { money } from '../../../utils/format.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { ClientPicker } from './ClientPicker.jsx';
import { CartLine } from './CartLine.jsx';
import { CartTotals } from './CartTotals.jsx';
import { PaymentPicker } from './PaymentPicker.jsx';

/** Right side of the counter: the bill being written, styled as a receipt. */
export function CartPanel({ pos, clients, customer, staff, can, writable, onNewClient, onCustomCharge, onPark }) {
  const { cart, quote, quoteErr, setField, updateLine } = pos;
  return (
    <div className="perforated flex min-h-0 flex-1 flex-col">
      <ClientPicker clients={clients} customerId={cart.customerId} customer={customer} onChange={(id) => setField({ customerId: id })} onNewClient={can('customers.manage') ? onNewClient : null} />

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {!cart.lines.length && <p className="py-10 text-center text-sm text-stone-500">Tap a service or product to start the bill.</p>}
        {cart.lines.map((l, i) => (
          <CartLine key={l.key} line={l} staff={staff} quoteLine={quote?.lines?.[i]} canEditPrice={can('pos.price_override')} onChange={(patch) => updateLine(l.key, patch)} />
        ))}
        {can('pos.custom_item') && <button onClick={onCustomCharge} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"><FiEdit3 /> Add custom charge</button>}
      </div>

      <div className="space-y-3 border-t border-dashed border-stone-300 bg-white/60 px-4 py-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <Field as="select" label="Offer" value={cart.offer} onChange={(e) => setField({ offer: e.target.value })}>
            <option value="NONE">No discount</option>
            {customer?.activeMembership && <option value="MEMBERSHIP">Member discount</option>}
            {can('pos.discount') && <option value="COUPON">Coupon code</option>}
          </Field>
          {cart.offer === 'COUPON'
            ? <Field label="Code" value={cart.couponCode} onChange={(e) => setField({ couponCode: e.target.value.toUpperCase() })} placeholder="FIRST10" />
            : <Field label="Tip (₹)" type="number" min="0" step="10" value={cart.tip} onChange={(e) => setField({ tip: e.target.value })} />}
        </div>
        {quoteErr && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">{quoteErr}</p>}
        <CartTotals quote={quote} />
        <PaymentPicker payments={pos.payments} setPayments={pos.setPayments} split={pos.split} onToggleSplit={pos.toggleSplit} due={pos.due} hasCustomer={!!customer} />
        <div className="grid grid-cols-[auto_auto_1fr] gap-2">
          <Button onClick={() => pos.reset()} disabled={!cart.lines.length}>Clear</Button>
          <Button onClick={onPark} disabled={!cart.lines.length || !writable} title="Save this bill to finish later"><FiPause /> Park</Button>
          <Button variant="primary" onClick={pos.checkout} loading={pos.busy} disabled={!quote || !writable || Math.abs(pos.due) > 0.004}>
            {writable ? `Charge ${quote ? money(quote.grandTotal) : ''}` : 'Read-only — renew to bill'}
          </Button>
        </div>
      </div>
    </div>
  );
}
