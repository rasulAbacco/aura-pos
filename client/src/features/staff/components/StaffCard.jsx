import { money0, initials } from '../../../utils/format.js';
import { Badge, Button } from '../../../components/ui';

const PER = { MONTHLY: 'month', WEEKLY: 'week', DAILY: 'day' };

/** Directory card. KYC and salary only appear when the server included them (permission-based). */
export function StaffCard({ person: s, onEdit }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 font-bold text-rose-800" aria-hidden>{initials(s.name)}</span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{s.name}</h2><p className="text-sm text-stone-500">{s.designation}</p></div>
        {s.status !== 'ACTIVE' && <Badge>{s.status.toLowerCase()}</Badge>}
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-stone-500">Phone</dt><dd><a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a></dd></div>
        {s.whatsapp && <div className="flex justify-between"><dt className="text-stone-500">WhatsApp</dt><dd><a className="text-ledger hover:underline" href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{s.whatsapp}</a></dd></div>}
        {s.baseSalary !== undefined && <div className="flex justify-between"><dt className="text-stone-500">Base pay</dt><dd className="num">{money0(s.baseSalary)} / {PER[s.salaryFrequency]}</dd></div>}
        <div className="flex justify-between"><dt className="text-stone-500">Commission</dt><dd>{Number(s.serviceCommission)}% services · {Number(s.productCommission)}% retail</dd></div>
        {s.aadhaarLast4 !== undefined && <div className="flex justify-between"><dt className="text-stone-500">KYC</dt><dd className="text-xs">{s.aadhaarLast4 ? `Aadhaar ••••${s.aadhaarLast4}` : 'Aadhaar not recorded'}{s.panMasked ? ` · PAN ${s.panMasked}` : ''}</dd></div>}
      </dl>
      {onEdit && <Button size="sm" className="mt-3" onClick={() => onEdit(s)}>Edit</Button>}
    </article>
  );
}
