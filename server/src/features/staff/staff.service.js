/** Staff directory, compensation settings and masked KYC. Commission maths lives in staff.commission.js. */
import { prisma } from '../../core/database/prisma.js';
import { conflict, notFound, badRequest } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';

/** Replace raw identifiers with their masked forms before anything is stored. */
function maskKyc({ aadhaar, pan, bankAccount, ...rest }) {
  return {
    ...rest,
    ...(aadhaar ? { aadhaarLast4: aadhaar.slice(-4) } : {}),
    ...(pan ? { panMasked: `${pan.slice(0, 5)}••••${pan.slice(-1)}` } : {}),
    ...(bankAccount ? { bankAccountLast4: bankAccount.slice(-4) } : {}),
  };
}

const KYC_FIELDS = ['address', 'aadhaarLast4', 'panMasked', 'bankName', 'bankAccountLast4', 'ifsc'];
export function present(ctx, s) {
  const { tenantId, ...rest } = s;
  if (!ctx.permissions.has('staff.kyc')) for (const k of KYC_FIELDS) delete rest[k];
  if (!ctx.permissions.has('staff.manage') && !ctx.permissions.has('payroll.manage')) delete rest.baseSalary;
  return rest;
}

async function checkBranch(ctx, branchId) {
  if (branchId && !(await prisma.branch.findFirst({ where: { id: branchId, tenantId: ctx.tenantId } }))) throw badRequest('Unknown branch');
}

export const listStaff = (ctx, bookableOnly) => prisma.staffProfile.findMany({
  where: { tenantId: ctx.tenantId, archivedAt: null, ...(bookableOnly ? { isBookable: true, status: 'ACTIVE' } : {}) }, orderBy: { name: 'asc' },
});

export async function getStaff(ctx, id) {
  const s = await prisma.staffProfile.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!s) throw notFound('Staff member');
  if (ctx.permissions.has('staff.kyc')) await audit(prisma, ctx, 'staff.kyc_viewed', { entityType: 'StaffProfile', entityId: s.id });
  return s;
}

export async function createStaff(ctx, body) {
  await checkBranch(ctx, body.branchId);
  const max = ctx.entitlement.limits.maxStaff;
  return prisma.$transaction(async (tx) => {
    // Serialise quota checks per tenant so two concurrent adds can't both pass.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-quota:${ctx.tenantId}`}))`;
    const count = await tx.staffProfile.count({ where: { tenantId: ctx.tenantId, status: 'ACTIVE', archivedAt: null } });
    if (count >= max) throw conflict('PLAN_LIMIT_STAFF', `Your plan allows ${max} active staff. Upgrade to add more.`);
    const row = await tx.staffProfile.create({ data: { ...maskKyc(body), tenantId: ctx.tenantId } });
    await audit(tx, ctx, 'staff.create', { entityType: 'StaffProfile', entityId: row.id });
    return row;
  });
}

/** Rate changes apply to future sales; earned commissions are snapshotted on the ledger. */
export async function updateStaff(ctx, id, data) {
  const s = await prisma.staffProfile.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!s) throw notFound('Staff member');
  await checkBranch(ctx, data.branchId);
  const u = await prisma.staffProfile.update({ where: { id: s.id }, data: maskKyc(data) });
  const rateFields = ['baseSalary', 'salaryFrequency', 'serviceCommission', 'productCommission'].filter((k) => k in data);
  await audit(prisma, ctx, rateFields.length ? 'staff.compensation_change' : 'staff.update', {
    entityType: 'StaffProfile', entityId: s.id,
    detail: rateFields.length ? { before: Object.fromEntries(rateFields.map((k) => [k, String(s[k])])), after: Object.fromEntries(rateFields.map((k) => [k, String(data[k])])) } : { fields: Object.keys(data) },
  });
  return u;
}

export async function archiveStaff(ctx, id) {
  const { count } = await prisma.staffProfile.updateMany({ where: { id, tenantId: ctx.tenantId, archivedAt: null }, data: { archivedAt: new Date(), status: 'EXITED', isBookable: false } });
  if (!count) throw notFound('Staff member');
  await audit(prisma, ctx, 'staff.archive', { entityType: 'StaffProfile', entityId: id });
}
