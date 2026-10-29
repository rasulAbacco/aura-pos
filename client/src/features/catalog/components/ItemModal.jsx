import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { cx } from '../../../utils/cx.js';

const itemSchema = z.object({
  type: z.enum(['SERVICE', 'PRODUCT']),
  name: z.string().trim().min(2, 'Enter a name'),
  categoryId: z.string().min(1, 'Choose a category'),
  price: z.coerce.number({ message: 'Enter a price' }).min(0),
  taxRate: z.coerce.number().min(0).max(100),
  durationMin: z.coerce.number().int().min(5).max(720).optional(),
  openingStock: z.coerce.number().int().min(0).optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  cost: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
  sku: z.string().optional(),
  sacHsn: z.union([z.literal(''), z.string().regex(/^\d{4,8}$/, '4–8 digits')]).optional(),
  allowPriceOverride: z.boolean(),
});

/** Create or edit a service/product. Editing a price never changes past invoices. */
export function ItemModal({ item, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!item;
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? { ...item, categoryId: item.category.id, price: Number(item.price), taxRate: Number(item.taxRate), cost: item.cost ?? '', sku: item.sku ?? '', sacHsn: item.sacHsn ?? '' }
      : { type: 'SERVICE', taxRate: 18, durationMin: 45, openingStock: 0, minStock: 3, allowPriceOverride: true, categoryId: categories[0]?.id ?? '', sacHsn: '' },
  });
  const type = watch('type');

  const submit = handleSubmit(async (v) => {
    const body = { ...v, cost: v.cost === '' ? null : v.cost, sku: v.sku || null, sacHsn: v.sacHsn || null, durationMin: type === 'SERVICE' ? v.durationMin : undefined };
    try {
      if (editing) {
        const { type: _t, openingStock: _o, ...patch } = body;
        await api.patch(`/catalog/items/${item.id}`, patch);
      } else {
        await api.post('/catalog/items', type === 'SERVICE' ? { ...body, openingStock: undefined } : body);
      }
      toast(editing ? `Updated ${v.name}. New prices apply to future bills only.` : `Added ${v.name}`);
      onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${item.name}` : 'New service or product'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>{editing ? 'Save changes' : 'Add to price list'}</Button></>}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {!editing && (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
            {[['SERVICE', 'Salon service'], ['PRODUCT', 'Retail product']].map(([v, l]) => (
              <label key={v} className={cx('cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold', type === v ? 'border-rose-700 bg-rose-50 text-rose-800' : 'border-stone-300')}>
                <input type="radio" value={v} className="sr-only" {...register('type')} />{l}
              </label>
            ))}
          </div>
        )}
        <Field label="Name" {...register('name')} error={errors.name?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Field as="select" label="Category" {...register('categoryId')} error={errors.categoryId?.message}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Field>
          <Field label="Price (₹, before GST)" type="number" step="0.01" {...register('price')} error={errors.price?.message} />
          <Field label="GST rate (%)" type="number" step="0.01" {...register('taxRate')} error={errors.taxRate?.message} hint="Check the correct rate with your accountant." />
          <Field label={type === 'SERVICE' ? 'SAC code' : 'HSN code'} {...register('sacHsn')} error={errors.sacHsn?.message} placeholder={type === 'SERVICE' ? '999721' : '33051090'} />
          {type === 'SERVICE' ? <Field label="Duration (minutes)" type="number" {...register('durationMin')} error={errors.durationMin?.message} /> : <>
            {!editing && <Field label="Opening stock" type="number" {...register('openingStock')} />}
            <Field label="Reorder at (units)" type="number" {...register('minStock')} />
            <Field label="Unit cost (₹)" type="number" step="0.01" {...register('cost')} />
            <Field label="SKU / barcode" {...register('sku')} />
          </>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('allowPriceOverride')} /> Allow permitted staff to change the price at the counter</label>
      </form>
    </Modal>
  );
}
