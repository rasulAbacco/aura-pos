import { LuDownload } from 'react-icons/lu';

// Illustrative daily revenue (wine) and profit (blush) bars for October.
const BARS = [[60, 30], [85, 45], [70, 36], [95, 52], [80, 40], [110, 60], [90, 48], [120, 66], [100, 55], [135, 75], [115, 62], [150, 85], [130, 70], [160, 92], [145, 80]];

/** Profit & loss report card (features page, section 07). */
export function PnlMock() {
  return (
    <div className="site-card p-4 text-left text-[11px]">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold text-ink">Profit &amp; Loss Report</p><span className="flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-[10px] font-semibold text-mauve"><LuDownload size={10} />Export CSV</span></div>
      <p className="mt-1 text-[10px] text-stone-500">01 Oct 2026 – 31 Oct 2026</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[['Total Revenue', '₹1,86,400', '+12%', 'bg-petal'], ['Expenses', '₹62,100', '+5%', 'bg-rose-50'], ['Operating Profit', '₹1,24,300', '+16%', 'bg-emerald-50']].map(([l, v, d, bg]) => (
          <div key={l} className={`rounded-lg p-2 ${bg}`}><p className="text-[9px] text-stone-600">{l}</p><p className="text-sm font-bold text-ink">{v} <span className="text-[8px] font-semibold text-emerald-600">{d}</span></p></div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[9px] text-stone-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-mauve" />Revenue</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-rose-300" />Profit</span></div>
      <svg viewBox="0 0 300 120" className="mt-1 h-36 w-full" aria-label="Revenue and profit bars for October" role="img">
        {[0, 30, 60, 90].map((y) => <line key={y} x1="0" x2="300" y1={y + 10} y2={y + 10} stroke="#f0eaea" />)}
        {BARS.map(([r, p], i) => <g key={i}><rect x={8 + i * 19.5} y={110 - r * 0.6} width="7" height={r * 0.6} rx="1.5" fill="#7b2843" /><rect x={16 + i * 19.5} y={110 - p * 0.6} width="7" height={p * 0.6} rx="1.5" fill="#e8a5b4" /></g>)}
        {['1 Oct', '8 Oct', '15 Oct', '22 Oct', '31 Oct'].map((l, i) => <text key={l} x={10 + i * 70} y="119" fontSize="7" fill="#999">{l}</text>)}
      </svg>
    </div>
  );
}
