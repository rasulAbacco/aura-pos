/** My product orders (click and collect) with live status from the salon. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuShoppingBag, LuPhone, LuCheck } from 'react-icons/lu';
import { LuNavigation } from 'react-icons/lu';
import { api, errorMessage } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { directionsUrl } from '../lib/location.jsx';
import { useCart } from '../lib/cart.jsx';
import { ORDER_STATUS, ORDER_STEPS } from '../lib/constants.js';
import { rupees, shortDate } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Badge, Button, Empty, ErrorBox, Header, Page, Sheet, Spinner, cx } from '../components/ui.jsx';

function Steps({ status }) {
  const at = ORDER_STEPS.indexOf(status);
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Order progress">
      {ORDER_STEPS.map((s, i) => (
        <li key={s} className="flex flex-col items-center gap-1 text-center">
          <span className={cx('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', i <= at ? 'bg-mauve text-white' : 'bg-petal text-stone-400')}>{i <= at ? <LuCheck size={13} aria-hidden /> : i + 1}</span>
          <span className={cx('text-[11px] leading-tight', i <= at ? 'font-semibold text-ink' : 'text-stone-400')}>{ORDER_STATUS[s].short}</span>
        </li>
      ))}
    </ol>
  );
}

export default function OrdersPage() {
  const list = useApi('/orders', { every: 60000 });
  const { count, total, cart } = useCart();
  const toast = useToast();
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const doCancel = async () => {
    setBusy(true);
    try { await api.post(`/orders/${cancel.id}/cancel`, {}); toast(`Order ${cancel.number} cancelled`); setCancel(null); list.reload(); }
    catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen">
      <Header title="My orders" back={false} wide={false} />
      <Page narrow className="md:mt-4">
        {count > 0 && (
          <Link to="/cart" className="mb-4 flex items-center justify-between rounded-2xl bg-mauve px-4 py-3.5 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold"><LuShoppingBag aria-hidden />Cart: {count} item{count === 1 ? '' : 's'} from {cart.salonName}</span>
            <span className="num text-sm font-semibold">{rupees(total)} →</span>
          </Link>
        )}
        {list.error && <ErrorBox onRetry={list.reload}>{list.error}</ErrorBox>}
        {list.loading ? <Spinner /> : !list.data?.length ? (
          <Empty icon={LuShoppingBag} title="No orders yet" action={<Link to="/" className="font-semibold text-mauve">Find a salon</Link>}>Order products from a salon and pick them up at the counter.</Empty>
        ) : (
          <ul className="space-y-3">
            {list.data.map((o) => {
              const st = ORDER_STATUS[o.status];
              return (
                <li key={o.id} className="animate-rise rounded-2xl bg-white p-4 ring-1 ring-blush">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold leading-tight">Order {o.number}</p>
                      <Link to={`/s/${o.salon.slug}`} className="text-sm text-stone-600 hover:text-mauve"><b>{o.salon.name}</b> · {o.branch.name}</Link>
                      <p className="text-xs text-stone-500">{shortDate(o.createdAt)}</p>
                    </div>
                    <Badge tone={st.tone}>{st.short}</Badge>
                  </div>
                  <ul className="mt-3 space-y-0.5 text-sm">{o.lines.map((l) => <li key={l.itemId} className="flex justify-between gap-3"><span>{l.quantity} × {l.name}</span><span className="num">{rupees(Number(l.unitPrice) * l.quantity)}</span></li>)}</ul>
                  <p className="mt-1 flex justify-between border-t border-dashed border-blush pt-1 text-sm font-semibold"><span>Estimate</span><span className="num">{rupees(o.itemsTotal)}</span></p>
                  {o.status === 'CANCELLED' ? <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">{o.cancelledBy === 'CUSTOMER' ? 'You cancelled this order' : 'Cancelled by the salon'}{o.cancelReason ? `: ${o.cancelReason}` : ''}</p> : <Steps status={o.status} />}
                  {o.status === 'READY' && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">Ready for pickup at {o.branch.name}. Pay at the counter.</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.branch.phone && <a href={`tel:${o.branch.phone}`} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-mauve ring-1 ring-blush"><LuPhone size={14} aria-hidden />Call salon</a>}
                    <a href={directionsUrl({ lat: o.branch.latitude, lng: o.branch.longitude, query: `${o.salon.name} ${o.branch.address ?? ''}` })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-mauve ring-1 ring-blush"><LuNavigation size={14} aria-hidden />Directions</a>
                    {o.canCancel && <Button variant="danger" size="sm" onClick={() => setCancel(o)}>Cancel order</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Page>
      <Sheet open={!!cancel} onClose={() => setCancel(null)} title="Cancel this order?"
        footer={<><Button variant="secondary" className="flex-1" onClick={() => setCancel(null)}>Keep it</Button><Button className="flex-1" disabled={busy} onClick={doCancel}>{busy ? 'Cancelling…' : 'Cancel order'}</Button></>}>
        <p className="text-sm text-stone-600">Order {cancel?.number} at {cancel?.salon.name}. The salon is told straight away.</p>
      </Sheet>
    </div>
  );
}
