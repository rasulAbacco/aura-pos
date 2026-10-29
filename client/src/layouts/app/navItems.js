import { FiGrid, FiShoppingBag, FiCalendar, FiUsers, FiAward, FiList, FiPackage, FiUserCheck, FiDollarSign, FiPieChart, FiBarChart2, FiFileText, FiSettings, FiCreditCard } from 'react-icons/fi';

/** Sidebar entries, one per feature page. `perm` hides an entry when the user lacks it (the server still enforces access). */
export const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/app/pos', label: 'Billing counter', icon: FiShoppingBag, perm: 'pos.bill' },
  { to: '/app/appointments', label: 'Queue & chairs', icon: FiCalendar, perm: 'appointments.view' },
  { to: '/app/clients', label: 'Clients', icon: FiUsers, perm: 'customers.view' },
  { to: '/app/memberships', label: 'Memberships', icon: FiAward },
  { to: '/app/catalog', label: 'Price list', icon: FiList },
  { to: '/app/inventory', label: 'Inventory', icon: FiPackage, perm: 'inventory.view' },
  { to: '/app/staff', label: 'Staff & payroll', icon: FiUserCheck, perm: 'staff.view' },
  { to: '/app/invoices', label: 'Invoices', icon: FiFileText, perm: 'invoices.view' },
  { to: '/app/expenses', label: 'Expenses', icon: FiDollarSign, perm: 'expenses.view' },
  { to: '/app/pnl', label: 'Profit & loss', icon: FiPieChart, perm: 'reports.view' },
  { to: '/app/reports', label: 'Reports', icon: FiBarChart2, perm: 'reports.view' },
  { to: '/app/settings', label: 'Salon settings', icon: FiSettings, perm: 'settings.manage' },
  { to: '/app/subscription', label: 'Subscription', icon: FiCreditCard },
];
