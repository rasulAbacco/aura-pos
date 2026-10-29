/** Public surface of the POS feature (other features import from here, never from pos/ internals). */
export { posRoutes } from './pos.routes.jsx';
export { addItemToDraft, draftForClient } from './utils/posDraft.js';
