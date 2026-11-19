/**
 * Product cart (click and collect). One salon branch at a time, kept on the device.
 * Prices shown are the salon's list prices; the bill at pickup is the final amount.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'sg.customer.cart';
const empty = { slug: null, salonName: null, branchId: null, branchName: null, items: [] }; // items: [{ itemId, name, price, quantity, max, imageId, size }]
const load = () => { try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? 'null') }; } catch { return empty; } };

const Ctx = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* private mode */ } }, [cart]);

  /** Returns false when the cart holds another salon/branch (the caller asks before replacing). */
  const setQty = useCallback((ctx, product, quantity, { replace = false } = {}) => {
    let ok = true;
    setCart((c) => {
      const other = c.items.length && (c.slug !== ctx.slug || c.branchId !== ctx.branchId);
      if (other && !replace) { ok = false; return c; }
      const base = other ? { ...empty } : c;
      const items = base.items.filter((i) => i.itemId !== product.id);
      if (quantity > 0) items.push({ itemId: product.id, name: product.name, price: product.price, quantity: Math.min(quantity, product.max ?? 20), max: product.max ?? 20, imageId: product.imageId ?? product.images?.[0]?.id ?? null, size: product.size ?? null });
      items.sort((a, b) => a.name.localeCompare(b.name));
      return items.length ? { slug: ctx.slug, salonName: ctx.salonName, branchId: ctx.branchId, branchName: ctx.branchName, items } : { ...empty };
    });
    return ok;
  }, []);
  const clear = useCallback(() => setCart({ ...empty }), []);
  const count = cart.items.reduce((n, i) => n + i.quantity, 0);
  const total = cart.items.reduce((n, i) => n + Number(i.price) * i.quantity, 0);
  const value = useMemo(() => ({ cart, setQty, clear, count, total }), [cart, setQty, clear, count, total]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCart = () => useContext(Ctx);
