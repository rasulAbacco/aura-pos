/** Sign in with a mobile number: send a 6-digit SMS code, then enter it. No email, no password. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LuArrowLeft, LuShieldCheck } from 'react-icons/lu';
import { useAuth } from '../lib/auth.jsx';
import { errorMessage } from '../lib/api.js';
import { Button } from '../components/ui.jsx';
import logo from '../assets/logo-full.png';

const digits = (s) => s.replace(/\D/g, '');
const pretty = (p) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

export default function LoginPage() {
  const { requestCode, verifyCode, status, account } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const [devCode, setDevCode] = useState(null);
  const codeRef = useRef(null);

  useEffect(() => { if (status === 'authed' && account?.name) nav(next, { replace: true }); }, [status, account, nav, next]);
  useEffect(() => { if (!wait) return undefined; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const valid = /^[6-9]\d{9}$/.test(phone);
  const send = async (e) => {
    e?.preventDefault();
    if (!valid) { setError('Enter your 10-digit mobile number'); return; }
    setBusy(true); setError('');
    try {
      const r = await requestCode(phone);
      setDevCode(r.devCode ?? null);
      setStep('code'); setCode(''); setWait(r.resendAfterSec ?? 30);
    } catch (x) {
      setError(errorMessage(x));
      const retry = x?.response?.data?.error?.details?.retryAfterSec;
      if (retry) { setStep('code'); setWait(retry); }
    } finally { setBusy(false); }
  };
  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true); setError('');
    try {
      const r = await verifyCode(phone, value);
      nav(r.needsName ? `/welcome?next=${encodeURIComponent(next)}` : next, { replace: true });
    } catch (x) { setError(errorMessage(x)); setCode(''); } finally { setBusy(false); }
  };

  return (
    <div className="safe-top flex min-h-screen bg-cream">
      {/* Wide screens: brand panel on the left */}
      <aside className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-mauve to-mauve-deep p-12 text-white lg:flex">
        <img src={logo} alt="Salora Glam" className="h-12 w-auto self-start rounded-xl bg-white/95 p-2" />
        <div>
          <p className="font-display text-5xl font-semibold leading-tight">Salons, spas and beauty products near you.</p>
          <ul className="mt-8 space-y-3 text-lg text-white/85">
            <li>✓ Real prices and free times</li>
            <li>✓ Book in a minute, the salon confirms</li>
            <li>✓ Order products, pick up at the shop</li>
          </ul>
        </div>
        <p className="text-sm text-white/60">Sign in with your mobile number — no password needed.</p>
      </aside>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-4 lg:justify-center">
        <button aria-label="Back" onClick={() => (step === 'code' ? setStep('phone') : nav(-1))} className="-ml-2 mb-6 self-start rounded-full p-2 hover:bg-petal"><LuArrowLeft size={20} /></button>
        <img src={logo} alt="Salora Glam" className="mb-8 h-10 w-auto self-start lg:hidden" />
        {step === 'phone' ? (
          <form onSubmit={send} className="flex flex-1 flex-col">
            <h1 className="font-display text-3xl font-semibold leading-tight">Book your next glow-up</h1>
            <p className="mt-2 text-stone-600">Sign in with your mobile number. We'll send you a 6-digit code.</p>
            <label className="mt-8 block">
              <span className="mb-1.5 block text-sm font-medium text-stone-700">Mobile number</span>
              <div className="flex items-center rounded-2xl border border-blush bg-white focus-within:border-mauve focus-within:ring-2 focus-within:ring-mauve/20">
                <span className="border-r border-blush px-4 py-3.5 font-semibold text-stone-600">+91</span>
                <input autoFocus type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={phone}
                  onChange={(e) => { setPhone(digits(e.target.value).replace(/^(91|0)(?=\d{10}$)/, '').slice(0, 10)); setError(''); }}
                  placeholder="98765 43210" className="num w-full rounded-r-2xl bg-transparent px-4 py-3.5 text-lg tracking-wide outline-none" aria-describedby="phone-err" />
              </div>
            </label>
            {error && <p id="phone-err" role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy || !valid}>{busy ? 'Sending…' : 'Send code'}</Button>
            <p className="mt-auto flex items-start gap-2 pt-10 text-xs text-stone-500"><LuShieldCheck className="mt-0.5 shrink-0" aria-hidden />Your number is shared only with the salons you book with, so they can reach you about your visit.</p>
          </form>
        ) : (
          <div className="flex flex-1 flex-col">
            <h1 className="font-display text-3xl font-semibold leading-tight">Enter the code</h1>
            <p className="mt-2 text-stone-600">Sent by SMS to <b className="num">{pretty(phone)}</b>. <button className="font-semibold text-mauve underline" onClick={() => setStep('phone')}>Change</button></p>
            <input ref={codeRef} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} aria-label="6-digit code"
              onChange={(e) => { const v = digits(e.target.value).slice(0, 6); setCode(v); setError(''); if (v.length === 6) verify(v); }}
              className="num mt-8 w-full rounded-2xl border border-blush bg-white px-4 py-4 text-center text-3xl font-semibold tracking-[0.5em] outline-none focus:border-mauve focus:ring-2 focus:ring-mauve/20" placeholder="••••••" />
            {devCode && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Test server: no SMS is sent. Your code is <b className="num">{devCode}</b>.</p>}
            {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
            <Button size="lg" className="mt-6 w-full" disabled={busy || code.length !== 6} onClick={() => verify()}>{busy ? 'Checking…' : 'Continue'}</Button>
            <button disabled={wait > 0 || busy} onClick={send} className="mt-4 text-sm font-semibold text-mauve disabled:text-stone-400">
              {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
