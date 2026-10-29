import { LuCheck, LuMinus } from 'react-icons/lu';
import { ALWAYS_INCLUDED, PLAN_FEATURE_LABELS } from '../../utils/siteContent.js';
import { displayName } from '../../utils/plans.js';

/** Feature comparison built from the same server plans as the cards (limits + feature codes). */
export function ComparePlans({ plans }) {
  if (!plans?.length) return null;
  const codes = Object.keys(PLAN_FEATURE_LABELS).filter((c) => plans.some((p) => p.features?.includes(c)));
  const rows = [
    ['Staff members', plans.map((p) => `Up to ${p.maxStaff}`)],
    ['Branches / locations', plans.map((p) => (p.maxBranches > 1 ? `Up to ${p.maxBranches}` : '1'))],
    ...codes.map((c) => [PLAN_FEATURE_LABELS[c], plans.map((p) => p.features?.includes(c))]),
    ...ALWAYS_INCLUDED.map((l) => [l, plans.map(() => true)]),
  ];
  const cell = (v) => (v === true ? <LuCheck className="mx-auto text-mauve" aria-label="Included" /> : v === false ? <LuMinus className="mx-auto text-stone-300" aria-label="Not included" /> : v);
  return (
    <div className="overflow-x-auto rounded-2xl border border-blush bg-white">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-petal/60 text-ink"><tr><th className="px-5 py-3 text-left font-semibold">Features</th>{plans.map((p) => <th key={p.id} className="px-4 py-3 font-semibold">{displayName(p)}</th>)}</tr></thead>
        <tbody className="divide-y divide-blush/60">
          {rows.map(([label, vals]) => <tr key={label}><td className="px-5 py-2.5 text-stone-700">{label}</td>{vals.map((v, i) => <td key={i} className="px-4 py-2.5 text-center text-stone-700">{cell(v)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
