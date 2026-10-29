import { LuCheck } from 'react-icons/lu';

const TIERS = [
  ['Silver', '₹5,000', '6 months', 'Basic services discount', ['10% off services', 'Priority booking']],
  ['Gold', '₹10,000', '12 months', 'More benefits for regulars', ['15% off services', '5% off products', 'Priority booking', 'Wallet credits']],
  ['Platinum', '₹20,000', '12 months', 'Premium experience', ['20% off services', '10% off products', 'Exclusive offers', 'Priority support']],
];

/** Example membership tiers a salon could set up (features page, section 04). Illustrative values. */
export function TiersMock() {
  return (
    <div className="grid grid-cols-3 gap-3 text-left text-[10px]">
      {TIERS.map(([n, p, v, d, perks], i) => (
        <div key={n} className={`site-card relative flex flex-col p-3 ${i === 1 ? 'ring-2 ring-mauve/30' : ''}`}>
          {i === 1 && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-mauve px-2 py-0.5 text-[8px] font-semibold text-white">Most Popular</span>}
          <p className="text-sm font-semibold text-ink">{n}</p><p className="mt-1 text-base font-bold text-ink">{p}</p><p className="text-stone-500">{v}</p>
          <p className="mt-2 text-stone-600">{d}</p>
          <ul className="mt-2 flex-1 space-y-1">{perks.map((t) => <li key={t} className="flex gap-1"><LuCheck size={10} className="mt-0.5 shrink-0 text-mauve" />{t}</li>)}</ul>
          <span className="mt-3 rounded-md bg-mauve py-1.5 text-center text-[9px] font-semibold text-white">Select Plan</span>
        </div>
      ))}
    </div>
  );
}
