// Display formatting only. Amounts arrive from the API as exact 2-dp strings;
// all authoritative arithmetic happens on the server in decimal.
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const money = (v) => inr.format(Number(v ?? 0));
export const money0 = (v) => inr0.format(Number(v ?? 0));
export const dateTime = (v) => new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
export const date = (v) => new Date(v).toLocaleDateString('en-IN', { dateStyle: 'medium' });
export const time = (v) => new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
