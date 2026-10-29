import { api, errorMessage } from '../lib/api.js';

/** Authenticated file download (the bearer token isn't sent on a plain <a href>). */
export async function downloadCsv(path, toast) {
  try {
    const r = await api.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = Object.assign(document.createElement('a'), { href: url, download: path.split('/').pop().split('?')[0] });
    a.click(); URL.revokeObjectURL(url);
  } catch (e) { toast?.(errorMessage(e), 'error'); }
}
