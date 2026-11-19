/** Product cart → pickup order at one branch. Paid at the salon when collected. */
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuShoppingBag, LuStore, LuTrash2, LuPackageCheck, LuPackage, LuWallet } from 'react-icons/lu';
import { api, errorMessage, newRequestId } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { forgetCached } from '../lib/useApi.js';
import { rupees } from '../lib/format.js';
import { imageUrl } from '../lib/media.js';
import { useToast } from '../components/Toast.jsx';
import { Button, Empty, Field, Header, Page, Stepper } from '../components/ui.jsx';

export default function CartPage() {
  const { cart, setQty, clear, total, count } = useCart();
  const { status, account } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const requestId = useRef(newRequestId());
  const ctx = { slug: cart.slug, salonName: cart.salonName, branchId: cart.branchId, branchName: cart.branchName };

  const place = async () => {
    if (status !== 'authed' || !account?.name) { nav(`/login?next=${encodeURIComponent('/cart')}`); return; }
    setBusy(true);
    try {
      const r = await api.post('/orders', { requestId: requestId.current, branchId: cart.branchId, items: cart.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })), notes: notes.trim() || undefined });
      clear(); forgetCached('/orders'); forgetCached(`/salons/${cart.slug}`);
      setDone(r.data.data);
    } catch (e) {
      const d = e?.response?.data?.error;
      if (d?.code === 'OUT_OF_STOCK' && d.details) {
        const item = cart.items.find((i) => i.itemId === d.details.itemId);
        if (item) setQty(ctx, { id: item.itemId, name: item.name, price: item.price, max: d.details.available }, d.details.available);
      }
      requestId.current = newRequestId();
      toast(errorMessage(e), 'error');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen">
        <Header title="Order placed" back={false} />
        <Page className="text-center">
          <span className="mx-auto mb-4 mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-petal text-mauve"><LuPackageCheck size={30} aria-hidden /></span>
          <h2 className="font-display text-2xl font-semibold">Order {done.number}</h2>
          <p className="mt-2 text-stone-600">{done.salon.name} · {done.branch.name}</p>
          <p className="mt-3 text-sm text-stone-600">The salon will get it ready. Pick it up and pay at the counter. We'll show <b>Ready for pickup</b> in My orders.</p>
          <div className="mx-auto mt-6 grid max-w-xs gap-2">
            <Button size="lg" onClick={() => nav('/orders', { replace: true })}>View my orders</Button>
            <Button variant="ghost" onClick={() => nav('/', { replace: true })}>Keep exploring</Button>
          </div>
        </Page>
      </div>
    );
  }

  return (
    <div className="min-h-screen with-tabbar-action">
      <Header title="Your cart" sub={count ? `${cart.salonName} · ${cart.branchName}` : undefined} />
      <Page className="md:mt-4">
        {!count ? (
          <Empty icon={LuShoppingBag} title="Your cart is empty" action={<Link to="/" className="font-semibold text-mauve">Find a salon</Link>}>Add products from a salon's Products tab.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_22rem] md:items-start">
          <div>
            <Link to={`/s/${cart.slug}?branch=${cart.branchId}&tab=products`} className="mb-3 flex items-center gap-2 rounded-2xl bg-white p-3.5 text-sm ring-1 ring-blush">
              <LuStore className="text-mauve" aria-hidden /><span className="flex-1"><b>{cart.salonName}</b> · pickup at {cart.branchName}</span><span className="text-mauve">Add more</span>
            </Link>
            <ul className="divide-y divide-blush overflow-hidden rounded-2xl bg-white ring-1 ring-blush">
              {cart.items.map((i) => (
                <li key={i.itemId} className="flex items-center gap-3 px-4 py-3.5">
                  <Link to={`/s/${cart.slug}/p/${i.itemId}?branch=${cart.branchId}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-petal">
                    {i.imageId ? <img src={imageUrl(i.imageId)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-mauve/40"><LuPackage size={24} aria-hidden /></span>}
                  </Link>
                  <span className="min-w-0 flex-1"><span className="block font-medium">{i.name}</span>{i.size && <span className="block text-xs text-stone-500">{i.size}</span>}<span className="num text-sm text-stone-600">{rupees(i.price)} each</span></span>
                  <Stepper label={i.name} value={i.quantity} max={Math.min(i.max ?? 20, 20)} onChange={(q) => setQty(ctx, { id: i.itemId, name: i.name, price: i.price, max: i.max }, q)} />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between px-1 text-sm">
              <button onClick={clear} className="inline-flex items-center gap-1 font-semibold text-rose-700"><LuTrash2 aria-hidden size={14} />Empty cart</button>
              <span>Estimated total <b className="num text-base">{rupees(total)}</b></span>
            </div>
            <Field className="mt-5" as="textarea" rows={2} label="Note for the salon (optional)" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. I'll pick it up on Saturday" />
          </div>
          <aside className="rounded-3xl bg-white p-5 ring-1 ring-blush md:sticky md:top-24">
            <p className="font-display text-lg font-semibold">Order summary</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>Items ({count})</dt><dd className="num">{rupees(total)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd className="font-medium text-stone-500">Pickup only</dd></div>
              <div className="flex justify-between border-t border-dashed border-blush pt-2 text-base font-bold"><dt>Estimated total</dt><dd className="num">{rupees(total)}</dd></div>
            </dl>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li className="flex items-start gap-2"><LuStore className="mt-0.5 shrink-0 text-mauve" aria-hidden />Pick up at <b>{cart.branchName}</b> ({cart.salonName})</li>
              <li className="flex items-start gap-2"><LuWallet className="mt-0.5 shrink-0 text-mauve" aria-hidden />No payment now — pay at the shop. The final amount (with taxes) is on your bill there.</li>
            </ul>
            <Button size="lg" className="mt-5 hidden w-full md:flex" disabled={busy} onClick={place}>{busy ? 'Placing order…' : status === 'authed' ? 'Place pickup order' : 'Sign in to place order'}</Button>
          </aside>
          </div>
        )}
      </Page>
      {count > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-blush bg-white px-4 pt-3 md:hidden">
          <div className="mx-auto max-w-xl"><Button size="lg" className="w-full" disabled={busy} onClick={place}>{busy ? 'Placing order…' : status === 'authed' ? `Place pickup order · ${rupees(total)}` : 'Sign in to place order'}</Button></div>
        </div>
      )}
    </div>
  );
}
