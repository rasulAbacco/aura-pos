import { zonedDateString } from '../../core/utils/time.js';

/** Indian financial year label for a date in the tenant's zone, e.g. 2026-10-28 → "2627". */
export function fyLabel(date, tz) {
  const [y, m] = zonedDateString(date, tz).split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

/** Invoice and credit-note numbers: <branch code><FY>-<sequence>, e.g. MAIN2627-000001, CNMAIN2627-00001. */
export const invoiceNumber = (branchCode, fy, seq) => `${branchCode}${fy}-${String(seq).padStart(6, '0')}`;
export const creditNoteNumber = (branchCode, fy, seq) => `CN${branchCode}${fy}-${String(seq).padStart(5, '0')}`;
