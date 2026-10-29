/**
 * Permission catalogue and role defaults. The server is the only authority:
 * the SPA receives the effective list purely to decide what to *show*.
 *
 * Effective permissions = role defaults ∪ user.permissionGrants − user.permissionRevokes.
 * OWNER always has every permission and cannot be reduced (prevents lock-out).
 */
export const PERMISSIONS = [
  'pos.bill',            // create invoices / checkout
  'pos.price_override',  // change unit price of a catalogue line
  'pos.custom_item',     // add ad-hoc custom-priced lines
  'pos.discount',        // apply coupons / offers
  'pos.refund',          // refunds & credit notes
  'pos.void',            // void same-day invoices
  'invoices.view',
  'customers.view',
  'customers.manage',
  'customers.sensitive', // colour formulas, allergies, patch tests
  'wallet.adjust',       // manual wallet credit/debit with reason
  'appointments.view',
  'appointments.manage',
  'catalog.manage',
  'inventory.view',
  'inventory.manage',
  'memberships.manage',
  'staff.view',
  'staff.manage',
  'staff.kyc',           // view KYC / bank details
  'payroll.manage',
  'expenses.view',
  'expenses.manage',
  'reports.view',
  'reports.export',
  'settings.manage',
  'users.manage',
  'billing.manage',      // SaaS subscription & payments
];

const ALL = new Set(PERMISSIONS);

export const ROLE_DEFAULTS = {
  OWNER: [...ALL],
  MANAGER: PERMISSIONS.filter((p) => !['billing.manage', 'users.manage', 'staff.kyc', 'settings.manage'].includes(p)),
  RECEPTIONIST: ['pos.bill', 'pos.discount', 'invoices.view', 'customers.view', 'customers.manage', 'appointments.view', 'appointments.manage', 'inventory.view', 'staff.view'],
  STYLIST: ['appointments.view', 'customers.view', 'customers.sensitive', 'staff.view'],
  INVENTORY_MANAGER: ['inventory.view', 'inventory.manage', 'catalog.manage', 'reports.view'],
  ACCOUNTANT: ['invoices.view', 'expenses.view', 'expenses.manage', 'reports.view', 'reports.export', 'payroll.manage', 'staff.view'],
};

export function effectivePermissions(user) {
  if (user.role === 'OWNER') return new Set(ALL);
  const set = new Set(ROLE_DEFAULTS[user.role] ?? []);
  for (const p of user.permissionGrants ?? []) if (ALL.has(p)) set.add(p);
  for (const p of user.permissionRevokes ?? []) set.delete(p);
  return set;
}

export function isKnownPermission(p) { return ALL.has(p); }
