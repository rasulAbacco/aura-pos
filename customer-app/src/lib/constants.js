export const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'UNISEX_SALON', label: 'Unisex salon' },
  { value: 'WOMENS_PARLOUR', label: "Women's parlour" },
  { value: 'MENS_SALON', label: "Men's salon" },
  { value: 'SPA', label: 'Spa' },
  { value: 'SPA_SALON', label: 'Spa + salon' },
];
export const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label ?? null;

/** What a booking's status means for the customer. */
export const BOOKING_STATUS = {
  BOOKED: { label: 'Waiting for the salon to confirm', short: 'Requested', tone: 'amber' },
  CONFIRMED: { label: 'Confirmed', short: 'Confirmed', tone: 'green' },
  WAITING: { label: 'You’re checked in', short: 'Checked in', tone: 'blue' },
  CHECKED_IN: { label: 'You’re checked in', short: 'Checked in', tone: 'blue' },
  IN_SERVICE: { label: 'In progress', short: 'In progress', tone: 'blue' },
  COMPLETED: { label: 'Completed', short: 'Completed', tone: 'stone' },
  CANCELLED: { label: 'Cancelled', short: 'Cancelled', tone: 'rose' },
  NO_SHOW: { label: 'Missed', short: 'Missed', tone: 'rose' },
};
export const ORDER_STEPS = ['PLACED', 'CONFIRMED', 'READY', 'COLLECTED'];
export const ORDER_STATUS = {
  PLACED: { label: 'Order placed — waiting for the salon', short: 'Placed', tone: 'amber' },
  CONFIRMED: { label: 'Confirmed by the salon', short: 'Confirmed', tone: 'blue' },
  READY: { label: 'Ready for pickup', short: 'Ready', tone: 'green' },
  COLLECTED: { label: 'Collected', short: 'Collected', tone: 'stone' },
  CANCELLED: { label: 'Cancelled', short: 'Cancelled', tone: 'rose' },
};
export const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
