import { money0 } from '../../../utils/format.js';
import { Button } from '../../../components/ui';
import { cx } from '../../../utils/cx.js';
import { FEATURE_LABEL, INTERVAL_LABEL } from '../utils/subscription.constants.js';

export function PlanOptionCard({ plan: p, current, hasPlan, canBuy, disabled, loading, onBuy }) {
  return (
    <article className={cx('flex flex-col rounded-xl border bg-white p-5', current ? 'border-rose-700 ring-1 ring-rose-700' : 'border-stone-200')}>
      <h3 className="font-bold">{p.name}</h3>
      {p.description && <p className="mt-1 text-sm text-stone-600">{p.description}</p>}
      <p className="mt-3"><span className="num text-2xl font-extrabold">{money0(p.price)}</span><span className="text-sm text-stone-500"> / {INTERVAL_LABEL[p.interval]}</span></p>
      <ul className="mt-3 flex-1 space-y-1 text-sm text-stone-700">
        <li>Up to {p.maxStaff} staff · {p.maxBranches} branch{p.maxBranches > 1 ? 'es' : ''}</li>
        {p.features.map((f) => <li key={f}>{FEATURE_LABEL[f] ?? f}</li>)}
      </ul>
      {canBuy && (
        <Button className="mt-4" variant={current ? 'secondary' : 'primary'} loading={loading} disabled={disabled} onClick={() => onBuy(p)}>
          {current ? 'Renew' : hasPlan ? `Switch to ${p.name}` : `Choose ${p.name}`}
        </Button>
      )}
    </article>
  );
}
