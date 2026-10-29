export const APPOINTMENT_STATUS_LABEL = { BOOKED: 'Booked', CONFIRMED: 'Confirmed', WAITING: 'Waiting', CHECKED_IN: 'Checked in', IN_SERVICE: 'In chair', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No-show' };
export const APPOINTMENT_STATUS_TONE = { IN_SERVICE: 'green', WAITING: 'amber', CHECKED_IN: 'amber', COMPLETED: 'stone', CANCELLED: 'stone', NO_SHOW: 'rose', BOOKED: 'blue', CONFIRMED: 'blue' };
/** Next sensible step for each status (the server enforces the full transition table). */
export const NEXT_STEPS = { BOOKED: ['CONFIRMED', 'CHECKED_IN'], CONFIRMED: ['CHECKED_IN'], WAITING: ['IN_SERVICE'], CHECKED_IN: ['IN_SERVICE'] };
export const STEP_LABEL = { CONFIRMED: 'Confirm', CHECKED_IN: 'Check in', IN_SERVICE: 'Start service' };
/** IST day boundaries as instants. */
export const dayRange = (d) => ({ from: new Date(`${d}T00:00:00+05:30`).toISOString(), to: new Date(`${d}T23:59:59+05:30`).toISOString() });
