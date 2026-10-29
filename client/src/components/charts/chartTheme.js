/** Shared chart settings so every chart reads the same. */
export const axisTick = { fontSize: 11 };
export const rupeeK = (v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`);
export const CHART_COLORS = { revenue: '#047857', revenueLight: '#059669', revenuePale: '#34d399', staff: '#57534e', staffLight: '#a8a29e', expense: '#a12b3c', accentFill: '#fbe8ea' };
export const CHART_PALETTE = ['#1c1917', '#57534e', '#a12b3c', '#d75a6a', '#b45309', '#047857', '#0369a1', '#a8a29e'];
