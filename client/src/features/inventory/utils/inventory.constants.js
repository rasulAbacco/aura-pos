export const MOVEMENT_LABEL = {
  OPENING: 'Opening stock', RECEIPT: 'Received', SALE: 'Sold', REFUND_RETURN: 'Returned',
  ADJUSTMENT: 'Count correction', DAMAGE: 'Damaged', BACKBAR_USE: 'Backbar use', TRANSFER_IN: 'Transfer in', TRANSFER_OUT: 'Transfer out',
};
export const ADJUSTMENT_TYPES = [
  ['DAMAGE', 'Damaged or expired (removes stock)'],
  ['BACKBAR_USE', 'Used in services (removes stock)'],
  ['ADJUSTMENT', 'Count correction (+ or −)'],
];
