import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, errorMessage } from '../../../lib/api.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { clientSchema } from '../utils/clientSchema.js';

/** Used on the Clients page and from the billing counter's "New client" link. */
export function NewClientModal({ onClose, onCreated }) {
  const { can } = useAuth();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({ resolver: zodResolver(clientSchema), defaultValues: { marketingConsent: false } });
  const submit = handleSubmit(async (v) => {
    try {
      const r = await api.post('/clients', { ...v, email: v.email || null });
      toast(`${r.data.data.name} added`);
      onCreated(r.data.data);
    } catch (e) {
      if (e.response?.data?.error?.code === 'DUPLICATE_CUSTOMER') setError('phone', { message: e.response.data.error.message });
      else toast(errorMessage(e), 'error');
    }
  });
  return (
    <Modal open onClose={onClose} title="New client" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save client</Button></>}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" {...register('name')} error={errors.name?.message} autoComplete="off" />
          <Field label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} placeholder="+91 98765 43210" />
        </div>
        <Field label="Email (optional)" type="email" {...register('email')} error={errors.email?.message} />
        <Field label="Preferences" as="textarea" {...register('notes')} placeholder="Likes green tea; prefers Vikram" />
        {can('customers.sensitive') && <>
          <Field label="Colour formula" as="textarea" {...register('colorFormula')} placeholder="Inoa 5.1 + 20 vol" hint="Visible only to staff allowed to see treatment notes." />
          <Field label="Allergies" {...register('allergies')} placeholder="e.g. PPD, ammonia" />
        </>}
        <label className="flex items-start gap-2 text-sm text-stone-700"><input type="checkbox" className="mt-1" {...register('marketingConsent')} /> Client agrees to receive offers and reminders</label>
      </form>
    </Modal>
  );
}
