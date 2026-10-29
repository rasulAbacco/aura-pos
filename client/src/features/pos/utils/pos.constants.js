export const PAYMENT_METHODS = [['UPI', 'UPI'], ['CARD', 'Card'], ['CASH', 'Cash'], ['WALLET', 'Wallet']];
export const emptyPayment = (method = 'UPI', amount = '') => ({ method, amount, reference: '' });
