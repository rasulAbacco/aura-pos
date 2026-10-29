import { Link } from 'react-router-dom';
import { date } from '../../../utils/format.js';

/** Explains trial / grace / read-only states. Display only — the server enforces them. */
export function EntitlementBanner({ e }) {
  if (!e) return null;
  const renew = <Link to="/app/subscription" className="font-semibold underline underline-offset-2">Renew now</Link>;
  if (e.state === 'EXPIRED' || e.state === 'NONE') return <div role="alert" className="no-print bg-rose-700 px-4 py-2 text-sm text-white">Read-only mode: {e.reason} Your records, invoices and exports stay available. {renew}</div>;
  if (e.state === 'GRACE') return <div role="alert" className="no-print bg-amber-100 px-4 py-2 text-sm text-amber-900">{e.reason}. {renew}</div>;
  if (e.state === 'TRIAL') return <div className="no-print bg-stone-900 px-4 py-2 text-sm text-stone-100">Free trial — {e.daysLeft} day{e.daysLeft === 1 ? '' : 's'} left. <Link to="/app/subscription" className="font-semibold underline underline-offset-2">Choose a plan</Link></div>;
  if (e.renewalReminder) return <div className="no-print bg-amber-50 px-4 py-2 text-sm text-amber-900">Your {e.planName} plan renews or ends on {date(e.periodEnd)}. {renew}</div>;
  return null;
}
