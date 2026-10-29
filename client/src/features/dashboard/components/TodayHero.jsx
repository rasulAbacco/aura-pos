import { money0 } from '../../../utils/format.js';

/** The headline number: money collected today. */
export function TodayHero({ sales }) {
  return (
    <div className="col-span-2 rounded-xl bg-stone-900 p-5 text-white lg:col-span-1">
      <p className="text-sm text-stone-300">Collected today</p>
      <p className="num mt-1 text-3xl font-extrabold">{money0(sales.collectedToday)}</p>
      <p className="mt-1 text-sm text-stone-300">{sales.billsSettled} bill{sales.billsSettled === 1 ? '' : 's'} · {money0(sales.tips)} in tips</p>
    </div>
  );
}
