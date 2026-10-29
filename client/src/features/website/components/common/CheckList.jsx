import { LuCheck } from 'react-icons/lu';

/** Wine tick list; columns=2 splits it into two columns on wider screens. */
export function CheckList({ items, columns = 1, className = '' }) {
  return (
    <ul className={`grid gap-x-8 gap-y-2.5 text-sm text-stone-700 ${columns === 2 ? 'sm:grid-cols-2' : ''} ${className}`}>
      {items.map((t) => <li key={t} className="flex items-start gap-2"><LuCheck size={16} className="mt-0.5 shrink-0 text-mauve" aria-hidden />{t}</li>)}
    </ul>
  );
}
