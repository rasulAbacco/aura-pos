import { useApi } from '../../../hooks/useApi.js';

/** Products with stock at the current branch, plus the low-stock list and valuation. */
export function useStock() {
  const products = useApi('/catalog/items?type=PRODUCT');
  const low = useApi('/inventory/low-stock');
  const valuation = useApi('/inventory/valuation');
  const reload = () => { products.reload(); low.reload(); valuation.reload(); };
  return { products, low, valuation, reload };
}
