import { money } from '../../../utils/format.js';

/** Totals exactly as the server calculated them. */
export function CartTotals({ quote }) {
  return (
    <dl className="num space-y-1">
      <div className="flex justify-between"><dt className="text-stone-600">Subtotal</dt><dd>{money(quote?.subtotal)}</dd></div>
      {Number(quote?.discountTotal) > 0 && <div className="flex justify-between text-ledger"><dt>Discount</dt><dd>−{money(quote.discountTotal)}</dd></div>}
      <div className="flex justify-between"><dt className="text-stone-600">GST (CGST {money(quote?.cgstTotal)} + SGST {money(quote?.sgstTotal)})</dt><dd>{money(quote?.taxTotal)}</dd></div>
      {Number(quote?.tip) > 0 && <div className="flex justify-between"><dt className="text-stone-600">Tip</dt><dd>{money(quote.tip)}</dd></div>}
      {quote && Number(quote.roundOff) !== 0 && <div className="flex justify-between text-stone-500"><dt>Round-off</dt><dd>{money(quote.roundOff)}</dd></div>}
      <div className="flex items-baseline justify-between border-t border-stone-300 pt-1.5"><dt className="font-bold">Total</dt><dd className="text-xl font-extrabold text-rose-800">{money(quote?.grandTotal)}</dd></div>
    </dl>
  );
}
