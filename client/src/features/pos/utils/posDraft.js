/**
 * The in-progress bill is kept in sessionStorage so a refresh or crash doesn't lose it.
 * Other pages (Clients, Price list) use these helpers to pre-fill the bill before opening the POS.
 * The server re-validates and re-prices everything at checkout.
 */
export const DRAFT_KEY = 'aura.posDraft';
export const emptyCart = () => ({ lines: [], customerId: '', offer: 'NONE', couponCode: '', tip: '', appointmentId: null });

export function loadDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) ?? emptyCart(); } catch { return emptyCart(); }
}
export function saveDraft(cart) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(cart)); } catch { /* storage unavailable: draft just isn't kept */ }
}

/** Start a bill for a client (from the Clients page). */
export function draftForClient(customerId) { saveDraft({ ...emptyCart(), customerId }); }

/** Append a catalogue item to the current bill (from the Price list page). */
export function addItemToDraft(item) {
  const draft = loadDraft();
  draft.lines.push({ key: crypto.randomUUID(), type: item.type, itemId: item.id, name: item.name, quantity: 1, unitPrice: item.price, listPrice: item.price, staffId: '' });
  saveDraft(draft);
}
