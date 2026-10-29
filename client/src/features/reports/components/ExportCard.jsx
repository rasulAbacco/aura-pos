import { FiDownload } from 'react-icons/fi';
import { Button } from '../../../components/ui';

export function ExportCard({ title, description, onDownload, disabled }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-stone-600">{description}</p></div>
      <Button size="sm" disabled={disabled} onClick={onDownload}><FiDownload /> Download CSV</Button>
    </div>
  );
}
