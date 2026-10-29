import { api } from '../../../lib/api.js';
import { Button, Skeleton } from '../../../components/ui';
import { Modal } from '../../../components/modals';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';

/** Bills saved with "Park" at this branch. Resuming removes it from the list. */
export function ParkedBillsModal({ onClose, onResume }) {
  const parked = useApi('/pos/parked');
  const toast = useToast();
  const resume = async (p) => { onResume(p); await api.delete(`/pos/parked/${p.id}`).catch(() => {}); toast(`Resumed "${p.label}"`); };
  return (
    <Modal open onClose={onClose} title="Parked bills" description="Bills saved to finish later. Prices are re-checked when you charge.">
      {parked.loading ? <Skeleton rows={3} /> : !parked.data?.length ? <p className="text-sm text-stone-500">No parked bills at this branch.</p> : (
        <ul className="divide-y divide-stone-100">
          {parked.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span><b>{p.label}</b><span className="ml-2 text-stone-500">{p.payload.lines?.length ?? 0} items</span></span>
              <Button size="sm" onClick={() => resume(p)}>Resume</Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
