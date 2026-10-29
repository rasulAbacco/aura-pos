import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuArrowRight, LuLock } from 'react-icons/lu';
import { api, errorMessage } from '../../../../lib/api.js';
import { BUDGET_OPTIONS, INTEREST_OPTIONS } from '../../utils/siteContent.js';

const input = 'w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:border-mauve/50 focus:outline-none focus:ring-2 focus:ring-mauve/20';
const Label = ({ htmlFor, children, required }) => <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">{children}{required && <span className="text-mauve"> *</span>}</label>;

/**
 * Enquiry form. Saved on the server (rate-limited, hidden honeypot for bots) and shown to the
 * platform admin under Enquiries. "Interested in" becomes the subject; company and budget are added to the message.
 */
export function ContactForm() {
  const [params] = useSearchParams();
  const preset = params.get('interest');
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', interest: INTEREST_OPTIONS.includes(preset) ? preset : preset ? 'Other' : '', budget: '', message: preset && !INTEREST_OPTIONS.includes(preset) ? `I'm interested in ${preset}.\n` : '', consent: false, website: '' });
  const [state, setState] = useState({ busy: false, done: false, err: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, done: false, err: '' });
    const extra = [f.company && `Company: ${f.company}`, f.budget && `Budget: ${f.budget}`].filter(Boolean).join('\n');
    try {
      await api.post('/public/contact', { name: f.name, email: f.email, phone: f.phone, subject: `Interested in: ${f.interest}`, message: extra ? `${f.message}\n\n${extra}` : f.message, consent: f.consent, website: f.website });
      setState({ busy: false, done: true, err: '' });
    } catch (e2) { setState({ busy: false, done: false, err: errorMessage(e2) }); }
  };
  if (state.done) return <div role="status" className="rounded-xl bg-petal p-6 text-ink"><p className="font-display text-2xl">Thank you!</p><p className="mt-2 text-sm text-stone-700">Your enquiry has been received. Our team will get back to you soon.</p></div>;
  return (
    <form onSubmit={submit} className="space-y-4">
      {state.err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.err}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="cf-name" required>Full Name</Label><input id="cf-name" className={input} required minLength={2} value={f.name} onChange={set('name')} placeholder="Enter your full name" autoComplete="name" /></div>
        <div><Label htmlFor="cf-email" required>Business Email</Label><input id="cf-email" type="email" className={input} required value={f.email} onChange={set('email')} placeholder="Enter your business email" autoComplete="email" /></div>
        <div><Label htmlFor="cf-phone" required>Phone Number</Label><input id="cf-phone" type="tel" className={input} required maxLength={20} value={f.phone} onChange={set('phone')} placeholder="Enter your phone number" autoComplete="tel" /></div>
        <div><Label htmlFor="cf-company">Company Name (optional)</Label><input id="cf-company" className={input} value={f.company} onChange={set('company')} placeholder="Enter your company name" autoComplete="organization" /></div>
        <div><Label htmlFor="cf-interest" required>Interested In</Label>
          <select id="cf-interest" className={input} required value={f.interest} onChange={set('interest')}><option value="" disabled>Select a product or service</option>{INTEREST_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></div>
        <div><Label htmlFor="cf-budget">Project Budget (optional)</Label>
          <select id="cf-budget" className={input} value={f.budget} onChange={set('budget')}><option value="">Select budget range</option>{BUDGET_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></div>
      </div>
      <div><Label htmlFor="cf-message" required>Message</Label><textarea id="cf-message" className={`${input} min-h-32`} required minLength={10} value={f.message} onChange={set('message')} placeholder="Tell us about your requirements..." /></div>
      <div className="hidden" aria-hidden><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
      <label className="flex items-start gap-2 text-xs text-stone-600"><input type="checkbox" className="mt-0.5 accent-[var(--color-mauve)]" checked={f.consent} onChange={set('consent')} required /> I agree to be contacted about this enquiry.</label>
      <button type="submit" disabled={state.busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-mauve py-3.5 text-sm font-semibold text-white transition hover:bg-mauve-deep disabled:opacity-60">
        {state.busy ? 'Sending…' : <>Send Enquiry <LuArrowRight size={16} /></>}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-stone-500"><LuLock size={12} />Your information is safe with us. We only use it to respond to your enquiry.</p>
    </form>
  );
}
