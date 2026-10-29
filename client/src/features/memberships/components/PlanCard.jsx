import { money0 } from '../../../utils/format.js';
import { Button } from '../../../components/ui';

export function PlanCard({ plan: p, onSell }) {
  return (
    <article className="flex flex-col rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-bold">{p.name}</h2>
      <p className="mt-2"><span className="num text-2xl font-extrabold">{money0(p.price)}</span><span className="text-sm text-stone-500"> + GST · {p.validityMonths} month{p.validityMonths > 1 ? 's' : ''}</span></p>
      <ul className="mt-3 flex-1 space-y-1 text-sm text-stone-700">
        <li>{Number(p.discountPercent)}% off {[p.appliesToServices && 'services', p.appliesToProducts && 'retail'].filter(Boolean).join(' and ')}</li>
        {Number(p.bonusWalletCredit) > 0 && <li>{money0(p.bonusWalletCredit)} added to the client’s wallet on joining</li>}
        {p.perks && <li>{p.perks}</li>}
      </ul>
      {onSell && <Button className="mt-4" variant="dark" onClick={() => onSell(p)}>Sell this membership</Button>}
    </article>
  );
}
