import { date } from '../../../utils/format.js';
import { Badge, Button } from '../../../components/ui';
import { STATE_BADGE } from '../utils/subscription.constants.js';

export function CurrentPlanCard({ entitlement: e, canCancel, onCancel }) {
  return (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <div className="flex items-center gap-2"><h2 className="text-lg font-bold">{e.planName ?? 'No plan yet'}</h2><Badge tone={STATE_BADGE[e.state]?.[0]}>{STATE_BADGE[e.state]?.[1] ?? e.state}</Badge></div>
        <p className="mt-1 text-sm text-stone-600">
          {e.periodEnd && (e.state === 'EXPIRED' ? `Ended ${date(e.periodEnd)}.` : `${e.cancelling ? 'Ends' : 'Renews or ends'} on ${date(e.periodEnd)}.`)} {e.reason}
        </p>
        {e.state === 'EXPIRED' && <p className="mt-2 text-sm text-stone-600">While read-only you can still view and print invoices, look up clients, and export your data.</p>}
      </div>
      {canCancel && <Button variant="ghost" onClick={onCancel}>Cancel at period end</Button>}
    </section>
  );
}
