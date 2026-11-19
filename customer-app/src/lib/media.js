import { API_BASE_URL } from './api.js';
/** Address of a product/salon photo (public, cached by the browser). */
export const imageUrl = (id) => (id ? `${API_BASE_URL}/media/${id}` : null);
