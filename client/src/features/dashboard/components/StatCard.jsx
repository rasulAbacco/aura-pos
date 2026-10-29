import { Link } from 'react-router-dom';

export function StatCard({ label, value, note, warn, link }) {
  const body = <><p className="text-xs text-stone-500">{label}</p><p className={`num mt-1 text-2xl font-extrabold ${warn ? 'text-rose-800' : ''}`}>{value}</p>{note && <p className="text-xs text-stone-500">{note}</p>}</>;
  return link
    ? <Link to={link} className="rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400">{body}</Link>
    : <div className="rounded-xl border border-stone-200 bg-white p-4">{body}</div>;
}
