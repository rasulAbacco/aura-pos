/**
 * Photo upload/management for the salon (mounted inside the salon API) and the public photo address.
 *   POST   /catalog/items/:id/images        body = the image bytes (Content-Type image/jpeg|png|webp)
 *   PUT    /catalog/items/:id/images/order  { ids: [...] }   first = main photo
 *   GET    /catalog/items/:id/images
 *   POST   /settings/photos  · PUT /settings/photos/order · GET /settings/photos
 *   DELETE /media/:id
 *   GET    /api/v1/media/:id  (public, cached for a year — ids never change content)
 */
import express, { Router } from 'express';
import { z } from 'zod';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import { notFound, forbidden } from '../../core/errors/errors.js';
import { prisma } from '../../core/database/prisma.js';
import { parse, ok, created } from '../../core/utils/http.js';
import * as media from './media.service.js';

const raw = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '900kb' });
const dims = (q) => ({ width: Number(q.w) > 0 ? Math.round(Number(q.w)) : undefined, height: Number(q.h) > 0 ? Math.round(Number(q.h)) : undefined });
const orderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(6) });
const idOk = (_req, _res, next, id) => (/^[0-9a-f-]{36}$/i.test(id) ? next() : next(notFound('Photo')));

export const salonMediaRoutes = Router();
salonMediaRoutes.param('id', idOk);
const catalog = [requirePermission('catalog.manage'), requireWritable()];
const settings = [requirePermission('settings.manage'), requireWritable()];

salonMediaRoutes.get('/catalog/items/:id/images', async (req, res) => ok(res, await media.listImages(req.ctx, 'PRODUCT', req.params.id)));
salonMediaRoutes.post('/catalog/items/:id/images', ...catalog, raw, async (req, res) => created(res, await media.addImage(req.ctx, 'PRODUCT', req.params.id, req.body, dims(req.query))));
salonMediaRoutes.put('/catalog/items/:id/images/order', ...catalog, async (req, res) => ok(res, await media.reorder(req.ctx, 'PRODUCT', req.params.id, parse(orderSchema, req.body).ids)));
salonMediaRoutes.get('/settings/photos', async (req, res) => ok(res, await media.listImages(req.ctx, 'SALON', req.ctx.tenantId)));
salonMediaRoutes.post('/settings/photos', ...settings, raw, async (req, res) => created(res, await media.addImage(req.ctx, 'SALON', req.ctx.tenantId, req.body, dims(req.query))));
salonMediaRoutes.put('/settings/photos/order', ...settings, async (req, res) => ok(res, await media.reorder(req.ctx, 'SALON', req.ctx.tenantId, parse(orderSchema, req.body).ids)));
// Deleting needs the right for that kind of photo (catalogue or settings).
salonMediaRoutes.delete('/media/:id', requireWritable(), async (req, res) => {
  const m = await prisma.mediaImage.findFirst({ where: { id: req.params.id, tenantId: req.ctx.tenantId }, select: { ownerType: true } });
  if (!m) throw notFound('Photo');
  const need = m.ownerType === 'SALON' ? 'settings.manage' : 'catalog.manage';
  if (!req.ctx.permissions.has(need)) throw forbidden(`Missing permission: ${need}`);
  await media.removeImage(req.ctx, req.params.id);
  ok(res, { removed: true });
});

/** Public photo address. Cross-origin allowed so the customer website and phone apps can show it. */
export const publicMediaRoutes = Router();
publicMediaRoutes.get('/:id', async (req, res) => {
  const m = await media.getImage(req.params.id);
  const etag = `"${m.sha256}"`;
  res.set({ 'Content-Type': m.mimeType, 'Cache-Control': 'public, max-age=31536000, immutable', ETag: etag, 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' });
  if (req.get('if-none-match') === etag) return res.status(304).end();
  return res.send(Buffer.from(m.data));
});
