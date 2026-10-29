/** Once a day per branch, emails owners the products at or below their reorder level. */
import { prisma } from '../core/database/prisma.js';
import { zonedDateString } from '../core/utils/time.js';
import { notifyOnce, ownersOf } from './notify.js';

export async function runLowStockAlerts(now = new Date()) {
  const rows = await prisma.$queryRaw`
    SELECT s."tenantId", s."branchId", b."name" AS branch, t."timezone", c."name", s."quantity", c."minStock"
    FROM "StockLevel" s
    JOIN "CatalogItem" c ON c."id" = s."itemId"
    JOIN "Branch" b ON b."id" = s."branchId"
    JOIN "Tenant" t ON t."id" = s."tenantId"
    WHERE c."archivedAt" IS NULL AND c."type" = 'PRODUCT' AND s."quantity" <= c."minStock" AND t."status" = 'ACTIVE'
    ORDER BY s."branchId", c."name"`;
  const byBranch = new Map();
  for (const r of rows) {
    if (!byBranch.has(r.branchId)) byBranch.set(r.branchId, { ...r, items: [] });
    byBranch.get(r.branchId).items.push(r);
  }
  let sent = 0;
  for (const b of byBranch.values()) {
    const day = zonedDateString(now, b.timezone);
    const text = `These products are at or below their reorder level at ${b.branch}:\n\n${b.items.map((i) => `• ${i.name}: ${i.quantity} left (reorder at ${i.minStock})`).join('\n')}`;
    for (const owner of await ownersOf(b.tenantId)) {
      const r = await notifyOnce({ dedupeKey: `lowstock:${b.branchId}:${day}:${owner.email}`, tenantId: b.tenantId, to: owner.email, subject: `Low stock at ${b.branch}: ${b.items.length} product${b.items.length === 1 ? '' : 's'}`, text, template: 'low_stock' });
      if (r.sent) sent++;
    }
  }
  return { branches: byBranch.size, sent };
}
