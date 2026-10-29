import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../../../lib/api.js';
import { todayISO } from '../../../utils/format.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { CATEGORY_LABELS, PAYMENT_MODES } from '../utils/expenses.constants.js';

const expenseSchema = z.object({
  title: z.string().trim().min(2, 'Describe the expense'),
  category: z.enum(Object.keys(CATEGORY_LABELS)),
  amount: z.coerce.number({ message: 'Enter an amount' }).positive('Amount must be more than zero'),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  paymentMode: z.enum(Object.keys(PAYMENT_MODES)),
  vendor: z.string().optional(), reference: z.string().optional(), notes: z.string().optional(),
});

export function ExpenseModal({ onClose, onSaved }) {
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(expenseSchema), defaultValues: { category: 'UTILITIES', paymentMode: 'UPI', spentOn: todayISO() } });
  const submit = handleSubmit(async (v) => {
    try { await api.post('/expenses', v); toast(`Recorded “${v.title}”`); onSaved(); } catch (e) { toast(errorMessage(e), 'error'); }
  });
  return (
    <Modal open onClose={onClose} title="Record expense" description="Rent, utilities, supplies, laundry and other running costs."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Record expense</Button></>}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="What was it for?" {...register('title')} error={errors.title?.message} placeholder="BESCOM electricity – October" />
        <div className="grid grid-cols-2 gap-3">
          <Field as="select" label="Category" {...register('category')}>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
          <Field label="Amount (₹)" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
          <Field label="Date" type="date" {...register('spentOn')} error={errors.spentOn?.message} />
          <Field as="select" label="Paid by" {...register('paymentMode')}>{Object.entries(PAYMENT_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor (optional)" {...register('vendor')} />
          <Field label="Invoice / reference" {...register('reference')} />
        </div>
        <Field label="Notes" {...register('notes')} />
      </form>
    </Modal>
  );
}
