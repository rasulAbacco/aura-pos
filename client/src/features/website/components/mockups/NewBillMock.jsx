import { LuScissors, LuSparkles, LuHand, LuPlus, LuSearch, LuX, LuPrinter, LuSettings } from 'react-icons/lu';
import { Avatar } from './MockParts.jsx';

const LINES = [[LuScissors, 'Hair Spa (Moroccan Oil)', 'Neha', '₹1,500'], [LuSparkles, 'D-Tan Facial', 'Pooja', '₹1,200'], [LuHand, 'Gel Polish (Hands)', 'Pooja', '₹800']];

/** Illustrated billing screen for the home page. Totals are worked out (₹3,500 + 18% GST = ₹4,130). */
export function NewBillMock({ avatar }) {
  return (
    <div className="site-card p-4 text-left text-[11px]">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-ink">New Bill</p><span className="flex gap-2 text-stone-400"><LuPrinter size={13} /><LuSettings size={13} /><LuX size={13} /></span></div>
      <div className="flex items-center gap-2">
        <Avatar src={avatar} className="h-8 w-8" />
        <p className="flex-1"><b className="text-ink">Anitha R.</b> <span className="ml-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">Walk-in</span><span className="block text-stone-400">+91 98765 43210</span></p>
        <span className="flex items-center gap-1 rounded-md border border-mauve/40 px-2 py-1 text-[10px] font-semibold text-mauve"><LuPlus size={11} />Add Client</span>
      </div>
      <div className="my-3 flex items-center gap-2 rounded-md border border-stone-200 px-2 py-1.5 text-stone-400"><LuSearch size={12} />Search services or products…</div>
      <table className="w-full">
        <thead className="text-left text-[10px] text-stone-500"><tr className="border-b border-stone-100"><th className="py-1 font-medium">Item</th><th className="font-medium">Staff</th><th className="font-medium">Qty</th><th className="text-right font-medium">Price</th><th className="text-right font-medium">Amount</th></tr></thead>
        <tbody className="text-ink">
          {LINES.map(([Icon, n, s, p]) => <tr key={n} className="border-b border-stone-50"><td className="py-1.5"><span className="flex items-center gap-1.5"><Icon size={11} className="text-stone-400" />{n}</span></td><td>{s}</td><td>1</td><td className="text-right">{p}</td><td className="text-right">{p}</td></tr>)}
        </tbody>
      </table>
      <div className="mt-3 flex items-start justify-between gap-4">
        <span className="rounded-md border border-stone-200 px-3 py-1.5 text-[10px] font-semibold text-stone-600">Add Discount</span>
        <dl className="grid w-40 grid-cols-2 gap-y-1 text-right text-stone-500"><dt className="text-left">Subtotal</dt><dd>₹3,500</dd><dt className="text-left">GST (18%)</dt><dd>₹630</dd><dt className="text-left font-bold text-ink">Total</dt><dd className="font-bold text-ink">₹4,130</dd></dl>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold">
        <span className="rounded-md bg-stone-100 py-2 text-stone-700">Cash</span><span className="rounded-md bg-stone-100 py-2 text-stone-700">Card</span>
        <span className="rounded-md bg-mauve py-2 text-white">UPI</span><span className="rounded-md bg-petal py-2 text-mauve">Generate Bill</span>
      </div>
    </div>
  );
}
