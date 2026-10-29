import { dateTime } from '../../../utils/format.js';
import { useApi } from '../../../hooks/useApi.js';
import { Skeleton } from '../../../components/ui';
import { Modal } from '../../../components/modals';
import { DataTable } from '../../../components/tables';
import { MOVEMENT_LABEL } from '../utils/inventory.constants.js';

/** Every stock change for one product: the ledger always adds up to the stock on hand. */
export function MovementsModal({ item, onClose }) {
  const mv = useApi(`/inventory/movements?itemId=${item.id}&pageSize=100`);
  const columns = [
    { key: 'createdAt', header: 'When', render: (m) => dateTime(m.createdAt) },
    { key: 'type', header: 'What', render: (m) => MOVEMENT_LABEL[m.type] ?? m.type },
    { key: 'quantity', header: 'Change', align: 'right', render: (m) => <span className={m.quantity < 0 ? 'text-rose-700' : 'text-ledger'}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</span> },
    { key: 'balanceAfter', header: 'Balance', align: 'right' },
    { key: 'note', header: 'Reference', render: (m) => <span className="text-stone-600">{m.reference ?? m.note ?? ''}</span> },
  ];
  return (
    <Modal open wide onClose={onClose} title={`${item.name} — stock history`}>
      {mv.loading ? <Skeleton rows={4} /> : <DataTable columns={columns} rows={mv.data ?? []} minWidth={560} empty="No stock movements yet." />}
    </Modal>
  );
}
