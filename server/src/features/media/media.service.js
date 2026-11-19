/**
 * Photos for the customer app: product photos (PRODUCT, up to 3 each) and salon photos (SALON, up to 6).
 * Kept in Postgres (bytea) so they survive redeploys on hosts whose disk is temporary (Render).
 * The apps shrink photos before upload; the server checks the file really is JPEG/PNG/WebP and ≤ 800 KB.
 * Photos are public (shown in the app) and served by id with long caching.
 * For very large catalogues, move the bytes to object storage (S3/R2) — only this file changes.
 */
import crypto from 'node:crypto';
import { prisma } from '../../core/database/prisma.js';
import { AppError, badRequest, notFound } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';

export const LIMITS = { PRODUCT: 3, SALON: 6 };
export const MAX_BYTES = 800 * 1024;

/** Real file type from the first bytes (the Content-Type header alone can't be trusted). */
export function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

const view = (m) => ({ id: m.id, position: m.position, width: m.width, height: m.height });
const listSelect = { id: true, position: true, width: true, height: true };

/** Photo ids per owner, in display order (no bytes). */
export async function imagesFor(ownerType, ownerIds) {
  if (!ownerIds.length) return new Map();
  const rows = await prisma.mediaImage.findMany({ where: { ownerType, ownerId: { in: ownerIds } }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }], select: { ...listSelect, ownerId: true } });
  const m = new Map();
  for (const r of rows) { if (!m.has(r.ownerId)) m.set(r.ownerId, []); m.get(r.ownerId).push(view(r)); }
  return m;
}

async function assertOwner(ctx, ownerType, ownerId) {
  if (ownerType === 'SALON') { if (ownerId !== ctx.tenantId) throw notFound('Salon'); return; }
  const item = await prisma.catalogItem.findFirst({ where: { id: ownerId, tenantId: ctx.tenantId }, select: { id: true } });
  if (!item) throw notFound('Item');
}

export async function addImage(ctx, ownerType, ownerId, buf, { width, height } = {}) {
  await assertOwner(ctx, ownerType, ownerId);
  if (!Buffer.isBuffer(buf) || !buf.length) throw badRequest('Choose a photo to upload');
  if (buf.length > MAX_BYTES) throw new AppError(413, 'IMAGE_TOO_LARGE', 'Photo is too large (max 800 KB after resizing)');
  const mimeType = sniff(buf);
  if (!mimeType) throw badRequest('Use a JPG, PNG or WebP photo');
  return prisma.$transaction(async (tx) => {
    // Lock the owner's photos so two uploads at once can't exceed the limit.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`media:${ownerId}`}))`;
    const count = await tx.mediaImage.count({ where: { tenantId: ctx.tenantId, ownerType, ownerId } });
    if (count >= LIMITS[ownerType]) throw new AppError(422, 'IMAGE_LIMIT', `Up to ${LIMITS[ownerType]} photos. Remove one first.`);
    const m = await tx.mediaImage.create({
      data: { tenantId: ctx.tenantId, ownerType, ownerId, position: count, mimeType, sizeBytes: buf.length, width: width ?? null, height: height ?? null, sha256: crypto.createHash('sha256').update(buf).digest('hex'), data: buf },
      select: listSelect,
    });
    await audit(tx, ctx, 'media.add', { entityType: ownerType === 'SALON' ? 'Tenant' : 'CatalogItem', entityId: ownerId, detail: { imageId: m.id } });
    return view(m);
  });
}

export async function removeImage(ctx, id) {
  const m = await prisma.mediaImage.findFirst({ where: { id, tenantId: ctx.tenantId }, select: { id: true, ownerType: true, ownerId: true } });
  if (!m) throw notFound('Photo');
  await prisma.$transaction(async (tx) => {
    await tx.mediaImage.delete({ where: { id } });
    const rest = await tx.mediaImage.findMany({ where: { tenantId: ctx.tenantId, ownerType: m.ownerType, ownerId: m.ownerId }, orderBy: { position: 'asc' }, select: { id: true } });
    for (const [i, r] of rest.entries()) await tx.mediaImage.update({ where: { id: r.id }, data: { position: i } });
    await audit(tx, ctx, 'media.remove', { entityType: m.ownerType === 'SALON' ? 'Tenant' : 'CatalogItem', entityId: m.ownerId, detail: { imageId: id } });
  });
}

/** New order of an owner's photos (first = main photo). */
export async function reorder(ctx, ownerType, ownerId, ids) {
  await assertOwner(ctx, ownerType, ownerId);
  const rows = await prisma.mediaImage.findMany({ where: { tenantId: ctx.tenantId, ownerType, ownerId }, select: { id: true } });
  if (rows.length !== ids.length || !rows.every((r) => ids.includes(r.id))) throw badRequest('Send every photo id once');
  await prisma.$transaction(ids.map((id, i) => prisma.mediaImage.update({ where: { id }, data: { position: i } })));
  return (await imagesFor(ownerType, [ownerId])).get(ownerId) ?? [];
}

export const listImages = async (ctx, ownerType, ownerId) => { await assertOwner(ctx, ownerType, ownerId); return (await imagesFor(ownerType, [ownerId])).get(ownerId) ?? []; };

/** Public: the photo bytes. */
export async function getImage(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Photo');
  const m = await prisma.mediaImage.findUnique({ where: { id }, select: { data: true, mimeType: true, sha256: true } });
  if (!m) throw notFound('Photo');
  return m;
}
