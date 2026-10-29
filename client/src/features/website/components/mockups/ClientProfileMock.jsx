import { LuPhone, LuMail } from 'react-icons/lu';
import { Avatar } from './MockParts.jsx';

const PREFS = [['Hair Colour', 'Majirel 5.3'], ['Skin Type', 'Dry'], ['Allergies', 'None'], ['Patch Test', 'Passed - 15 Jun 2026'], ['Notes', 'Prefers mild products']];

/** Client profile card (features page, section 03). Demo client from the seed data. */
export function ClientProfileMock({ avatar }) {
  return (
    <div className="site-card grid gap-4 p-5 text-left text-[11px] sm:grid-cols-[1fr_8rem]">
      <div>
        <div className="flex items-center gap-3">
          <Avatar src={avatar} className="h-14 w-14" />
          <div><p className="text-base font-semibold text-ink">Pooja Sharma <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 align-middle text-[9px] font-semibold text-amber-700">Gold Member</span></p>
            <p className="mt-0.5 flex items-center gap-1 text-stone-500"><LuPhone size={10} />+91 98765 43210</p><p className="flex items-center gap-1 text-stone-500"><LuMail size={10} />pooja@email.com</p></div>
        </div>
        <div className="mt-4 flex gap-4 border-b border-stone-100 text-[10px]">{['Profile', 'Visit History', 'Purchases', 'Membership', 'Notes'].map((t, i) => <span key={t} className={`pb-1.5 ${i === 0 ? 'border-b-2 border-mauve font-semibold text-mauve' : 'text-stone-500'}`}>{t}</span>)}</div>
        <p className="mt-3 font-semibold text-ink">Preferences</p>
        <dl className="mt-1.5 grid grid-cols-[6rem_1fr] gap-y-1 text-stone-500">{PREFS.map(([k, v]) => [<dt key={k}>{k}</dt>, <dd key={`${k}v`} className="text-ink">{v}</dd>])}</dl>
      </div>
      <div className="space-y-2.5 sm:border-l sm:border-stone-100 sm:pl-4">
        {[['Total Visits', '8'], ['Total Spent', '₹24,300'], ['Last Visit', '12 Oct 2026']].map(([l, v]) => <div key={l}><p className="text-[10px] text-mauve">{l}</p><p className="text-base font-bold text-ink">{v}</p></div>)}
      </div>
    </div>
  );
}
