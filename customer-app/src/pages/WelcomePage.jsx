/** First sign-in: the name salons will see on bookings and orders. */
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { errorMessage } from '../lib/api.js';
import { Button, Field, Spinner } from '../components/ui.jsx';

export default function WelcomePage() {
  const { status, account, updateProfile } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (status === 'loading') return <Spinner />;
  if (status !== 'authed') return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await updateProfile({ name: name.trim(), email: email.trim() }); nav(next, { replace: true }); }
    catch (x) { setError(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <div className="safe-top min-h-screen bg-cream">
      <form onSubmit={save} className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-16">
        <h1 className="font-display text-3xl font-semibold">Welcome to Salora Glam</h1>
        <p className="mt-2 text-stone-600">What should salons call you?</p>
        <Field className="mt-8" label="Your name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" required />
        <Field className="mt-4" label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" hint="Only for your records. You always sign in with your mobile number." />
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        <Button type="submit" size="lg" className="mt-8" disabled={busy || name.trim().length < 2}>{busy ? 'Saving…' : 'Continue'}</Button>
      </form>
    </div>
  );
}
