/** Profile: your details, the salons that know your number (visits, wallet, membership, bills), sign out. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuPencil, LuLogOut, LuWallet, LuCrown, LuReceipt, LuStore, LuChevronDown, LuShieldCheck } from 'react-icons/lu';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/useApi.js';
import { errorMessage } from '../lib/api.js';
import { initials, rupees, shortDate } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Badge, Button, Empty, ErrorBox, Field, Header, Page, Sheet, Spinner, cx } from '../components/ui.jsx';

function EditSheet({ open, onClose }) {
  const { account, updateProfile } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(() => ({ name: account?.name ?? '', email: account?.email ?? '', gender: account?.gender ?? '', birthday: account?.birthday ?? '' }));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await updateProfile({ name: f.name.trim(), email: f.email.trim(), gender: f.gender, birthday: f.birthday }); toast('Profile saved'); onClose(); }
    catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Your details"
      footer={<Button size="lg" className="flex-1" disabled={busy || f.name.trim().length < 2} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>}>
      <div className="space-y-3">
        <Field label="Name" value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
        <Field label="Email (optional)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        <div className="grid grid-cols-2 gap-3">
          <Field as="select" label="Gender (optional)" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
            <option value="">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option>
          </Field>
          <Field label="Birthday (optional)" type="date" value={f.birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, birthday: e.target.value })} />
        </div>
        <p className="text-xs text-stone-500">Your mobile number is how you sign in, so it can't be changed here.</p>
      </div>
    </Sheet>
  );
}

function SalonRow({ s }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl bg-white ring-1 ring-blush">
      <button className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-petal text-mauve"><LuStore aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{s.salon.name}</span>
          <span className="block text-xs text-stone-500">{s.visits} visit{s.visits === 1 ? '' : 's'}{s.lastVisitAt ? ` · last ${shortDate(s.lastVisitAt)}` : ''}</span>
        </span>
        <LuChevronDown className={cx('text-stone-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-blush px-4 pb-4 pt-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-cream p-3"><p className="flex items-center gap-1 text-xs text-stone-500"><LuWallet size={12} aria-hidden />Wallet balance</p><p className="num font-semibold">{rupees(s.walletBalance)}</p></div>
            <div className="rounded-xl bg-cream p-3"><p className="text-xs text-stone-500">Total spent</p><p className="num font-semibold">{rupees(s.lifetimeSpend)}</p></div>
          </div>
          {s.membership && <p className="mt-2 flex items-center gap-2 rounded-xl bg-petal px-3 py-2 text-xs"><LuCrown className="text-mauve" aria-hidden /><b>{s.membership.name}</b> member · {s.membership.discountPercent}% off · until {shortDate(s.membership.endsAt)}</p>}
          {s.recentBills.length > 0 && <>
            <p className="mb-1 mt-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-stone-500"><LuReceipt size={12} aria-hidden />Recent bills</p>
            <ul className="divide-y divide-blush">{s.recentBills.map((b) => (
              <li key={b.number} className="flex items-center justify-between gap-2 py-1.5"><span><span className="num">{b.number}</span> <span className="text-xs text-stone-500">{shortDate(b.issuedAt)}</span></span><span className="num font-medium">{rupees(b.total)}{Number(b.due) > 0 && <Badge tone="amber">{rupees(b.due)} due</Badge>}</span></li>
            ))}</ul>
          </>}
          {s.salon.inApp && <Link to={`/s/${s.salon.slug}`} className="mt-3 inline-block font-semibold text-mauve">Open salon →</Link>}
        </div>
      )}
    </li>
  );
}

export default function ProfilePage() {
  const { account, signOut } = useAuth();
  const salons = useApi('/my-salons');
  const [edit, setEdit] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  return (
    <div className="min-h-screen">
      <Header title="Profile" back={false} wide={false} />
      <Page narrow className="space-y-6 md:mt-4">
        <section className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-mauve to-mauve-deep p-5 text-white">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 font-display text-2xl font-semibold">{initials(account?.name ?? '')}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-semibold">{account?.name}</p>
            <p className="num text-sm text-white/80">+91 {account?.phone.slice(0, 5)} {account?.phone.slice(5)}</p>
            {account?.email && <p className="truncate text-sm text-white/80">{account.email}</p>}
          </div>
          <button aria-label="Edit your details" onClick={() => setEdit(true)} className="rounded-full bg-white/15 p-2.5 hover:bg-white/25"><LuPencil aria-hidden /></button>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">My salons</h2>
          {salons.error && <ErrorBox onRetry={salons.reload}>{salons.error}</ErrorBox>}
          {salons.loading ? <Spinner /> : !salons.data?.length ? (
            <Empty icon={LuStore} title="No salon visits yet">Salons where you've booked or been billed with this number show here, with your visits, wallet and bills.</Empty>
          ) : <ul className="space-y-2">{salons.data.map((s) => <SalonRow key={s.salon.slug} s={s} />)}</ul>}
        </section>

        <section className="space-y-2">
          <p className="flex items-start gap-2 text-xs text-stone-500"><LuShieldCheck className="mt-0.5 shrink-0" aria-hidden />Salons see your name and mobile number when you book or order with them. They keep their own records of your visits.</p>
          <Button variant="danger" className="w-full" onClick={() => setConfirmOut(true)}><LuLogOut aria-hidden />Sign out</Button>
        </section>
      </Page>
      {edit && <EditSheet open onClose={() => setEdit(false)} />}
      <Sheet open={confirmOut} onClose={() => setConfirmOut(false)} title="Sign out?"
        footer={<><Button variant="secondary" className="flex-1" onClick={() => setConfirmOut(false)}>Stay signed in</Button><Button className="flex-1" onClick={() => { setConfirmOut(false); signOut(); }}>Sign out</Button></>}>
        <p className="text-sm text-stone-600">You can sign in again any time with your mobile number.</p>
      </Sheet>
    </div>
  );
}
