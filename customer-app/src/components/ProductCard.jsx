import { Link } from 'react-router-dom';
import { LuNavigation, LuPackage } from 'react-icons/lu';
import { rupees } from '../lib/format.js';
import { imageUrl } from '../lib/media.js';
import { formatKm } from '../lib/location.jsx';

export const percentOff = (price, mrp) => (mrp && Number(mrp) > Number(price) ? Math.round((1 - Number(price) / Number(mrp)) * 100) : 0);

export function PriceLine({ price, mrp, size = 'md' }) {
  const off = percentOff(price, mrp);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`num font-bold ${size === 'lg' ? 'text-2xl' : 'text-base'}`}>{rupees(price)}</span>
      {off > 0 && <><span className="num text-sm text-stone-400 line-through">{rupees(mrp)}</span><span className="text-sm font-bold text-emerald-700">{off}% off</span></>}
    </p>
  );
}

/** Product tile for grids: photo, brand, name, size, price, and (in the shop) which salon has it. */
export function ProductCard({ p, to, salonName, km, action, stockNote }) {
  const img = p.imageId ?? p.images?.[0]?.id;
  return (
    <div className="animate-rise group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-blush transition hover:shadow-lg hover:ring-mauve/30">
      <Link to={to} className="relative block aspect-square overflow-hidden bg-petal">
        {img
          ? <img src={imageUrl(img)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <span className="flex h-full w-full items-center justify-center text-mauve/40"><LuPackage size={48} aria-hidden /></span>}
        {percentOff(p.price, p.mrp) > 0 && <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">{percentOff(p.price, p.mrp)}% off</span>}
        {km != null && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold shadow"><LuNavigation size={10} aria-hidden />{formatKm(km)}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        {p.brand && <p className="truncate text-[11px] font-bold uppercase tracking-wide text-mauve">{p.brand}</p>}
        <Link to={to} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-mauve">{p.name}</Link>
        {p.size && <p className="text-xs text-stone-500">{p.size}</p>}
        {salonName && <p className="mt-0.5 truncate text-xs text-stone-500">at {salonName}</p>}
        <div className="mt-auto pt-2"><PriceLine price={p.price} mrp={p.mrp} /></div>
        {stockNote}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
