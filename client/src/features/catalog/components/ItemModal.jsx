import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { PhotoManager, uploadPending } from '../../../components/media/PhotoManager.jsx';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { cx } from '../../../utils/cx.js';

const optText = z.string().optional();
const itemSchema = z.object({
  type: z.enum(['SERVICE', 'PRODUCT']),
  name: z.string().trim().min(2, 'Enter a name'),
  categoryId: z.string().min(1, 'Choose a category'),
  price: z.coerce.number({ message: 'Enter a price' }).min(0),
  mrp: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
  taxRate: z.coerce.number().min(0).max(100),
  durationMin: z.coerce.number().int().min(5).max(720).optional(),
  openingStock: z.coerce.number().int().min(0).optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  cost: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
  sku: z.string().optional(),
  sacHsn: z.union([z.literal(''), z.string().regex(/^\d{4,8}$/, '4–8 digits')]).optional(),
  allowPriceOverride: z.boolean(),
  showInApp: z.boolean(),
  brand: optText, size: optText, description: optText, highlights: optText, howToUse: optText, ingredients: optText,
}).refine((v) => v.mrp === '' || v.mrp == null || v.mrp >= v.price, { path: ['mrp'], message: 'MRP can’t be below the selling price' });

const blank = (v) => (v == null || v === '' ? null : typeof v === 'string' ? v.trim() || null : v);

function Section({ title, hint, children }) {
  return (
    <fieldset className="space-y-3 border-t border-stone-200 pt-4 first:border-0 first:pt-0">
      <legend className="text-sm font-bold text-stone-900">{title}{hint && <span className="ml-2 text-xs font-normal text-stone-500">{hint}</span>}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Create or edit a service/product. Editing a price never changes past invoices.
 * Products also carry their shop details and up to 3 photos for the customer app.
 */
export function ItemModal({ item, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!item;
  const [pending, setPending] = useState([]);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
        ...item, categoryId: item.category.id, price: Number(item.price), taxRate: Number(item.taxRate), cost: item.cost ?? '', sku: item.sku ?? '', sacHsn: item.sacHsn ?? '',
        mrp: item.mrp ?? '', brand: item.brand ?? '', size: item.size ?? '', description: item.description ?? '', highlights: item.highlights ?? '', howToUse: item.howToUse ?? '', ingredients: item.ingredients ?? '', showInApp: item.showInApp ?? true,
      }
      : { type: 'PRODUCT', taxRate: 18, durationMin: 45, openingStock: 0, minStock: 3, allowPriceOverride: true, showInApp: true, categoryId: categories[0]?.id ?? '', sacHsn: '', mrp: '' },
  });
  const type = watch('type');
  const isProduct = type === 'PRODUCT';

  const submit = handleSubmit(async (v) => {
    const body = {
      ...v, cost: v.cost === '' ? null : v.cost, sku: v.sku || null, sacHsn: v.sacHsn || null,
      durationMin: isProduct ? undefined : v.durationMin,
      mrp: isProduct && v.mrp !== '' && v.mrp != null ? v.mrp : null,
      description: blank(v.description),
      brand: isProduct ? blank(v.brand) : null, size: isProduct ? blank(v.size) : null,
      highlights: isProduct ? blank(v.highlights) : null, howToUse: isProduct ? blank(v.howToUse) : null, ingredients: isProduct ? blank(v.ingredients) : null,
    };
    try {
      if (editing) {
        const { type: _t, openingStock: _o, ...patch } = body;
        await api.patch(`/catalog/items/${item.id}`, patch);
      } else {
        const r = await api.post('/catalog/items', isProduct ? body : { ...body, openingStock: undefined });
        if (pending.length) {
          try { await uploadPending(`/catalog/items/${r.data.data.id}/images`, pending); }
          catch (e) { toast(`${v.name} saved, but a photo didn't upload: ${errorMessage(e)}. Add it again from Edit.`, 'error'); }
        }
      }
      toast(editing ? `Updated ${v.name}. New prices apply to future bills only.` : `Added ${v.name}`);
      onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); }
  });

  return (
    <Modal open wide onClose={onClose} title={editing ? `Edit ${item.name}` : 'New product or service'}
      description={isProduct ? 'Products are sold at the counter and, when shown in the app, ordered by customers for pickup at your shop.' : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>{editing ? 'Save changes' : 'Add to price list'}</Button></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {!editing && (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
            {[['PRODUCT', 'Retail product'], ['SERVICE', 'Salon service']].map(([v, l]) => (
              <label key={v} className={cx('cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold', type === v ? 'border-rose-700 bg-rose-50 text-rose-800' : 'border-stone-300')}>
                <input type="radio" value={v} className="sr-only" {...register('type')} />{l}
              </label>
            ))}
          </div>
        )}

        <Section title="Basics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2" {...register('name')} error={errors.name?.message} placeholder={isProduct ? 'e.g. Absolut Repair Shampoo' : 'e.g. Haircut & blow-dry'} />
            {isProduct && <Field label="Brand" {...register('brand')} placeholder="L'Oréal Professionnel" />}
            {isProduct && <Field label="Size / pack" {...register('size')} placeholder="300 ml" />}
            <Field as="select" label="Category" {...register('categoryId')} error={errors.categoryId?.message}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Field>
            {!isProduct && <Field label="Duration (minutes)" type="number" {...register('durationMin')} error={errors.durationMin?.message} />}
          </div>
        </Section>

        <Section title="Price & tax">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Selling price (₹, before GST)" type="number" step="0.01" {...register('price')} error={errors.price?.message} />
            {isProduct && <Field label="MRP (₹, optional)" type="number" step="0.01" {...register('mrp')} error={errors.mrp?.message} hint="Shown struck through in the app when higher." />}
            <Field label="GST rate (%)" type="number" step="0.01" {...register('taxRate')} error={errors.taxRate?.message} hint="Check the correct rate with your accountant." />
            <Field label={isProduct ? 'HSN code' : 'SAC code'} {...register('sacHsn')} error={errors.sacHsn?.message} placeholder={isProduct ? '33051090' : '999721'} />
            {isProduct && <Field label="Unit cost (₹)" type="number" step="0.01" {...register('cost')} hint="For your margins; never shown to customers." />}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose-700" {...register('allowPriceOverride')} /> Allow permitted staff to change the price at the counter</label>
        </Section>

        {isProduct && (
          <Section title="Stock">
            <div className="grid gap-3 sm:grid-cols-3">
              {!editing && <Field label="Opening stock (this branch)" type="number" {...register('openingStock')} />}
              <Field label="Reorder at (units)" type="number" {...register('minStock')} />
              <Field label="SKU / barcode" {...register('sku')} />
            </div>
          </Section>
        )}

        <Section title="Customer app" hint={isProduct ? 'What shoppers see on the product page' : 'What clients see when booking'}>
          <label className="flex items-start gap-2 rounded-lg border border-stone-200 p-3 text-sm">
            <input type="checkbox" className="mt-0.5 accent-rose-700" {...register('showInApp')} />
            <span><b>Show in the Salora Glam app</b><span className="block text-xs text-stone-500">{isProduct ? 'Customers can order it for pickup at your shop (only while in stock).' : 'Customers can request this service when booking.'}</span></span>
          </label>
          {isProduct && (
            editing
              ? <PhotoManager max={3} uploadUrl={`/catalog/items/${item.id}/images`} orderUrl={`/catalog/items/${item.id}/images/order`} initial={item.images ?? []} label="Product photos" />
              : <PhotoManager max={3} pending={pending} onPendingChange={setPending} label="Product photos" />
          )}
          <Field as="textarea" rows={3} label="Description" {...register('description')} placeholder={isProduct ? 'What it is and who it’s for' : 'What’s included'} />
          {isProduct && <>
            <Field as="textarea" rows={3} label="Key benefits (one per line)" {...register('highlights')} placeholder={'Repairs damaged hair\nAdds shine\nSulphate free'} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field as="textarea" rows={3} label="How to use" {...register('howToUse')} />
              <Field as="textarea" rows={3} label="Ingredients" {...register('ingredients')} />
            </div>
          </>}
        </Section>
      </form>
    </Modal>
  );
}
