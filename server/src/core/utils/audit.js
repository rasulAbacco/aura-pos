/** Append-only audit trail. Pass `db` = transaction client to make the audit row atomic with the change. */
export function audit(db, ctx, action, { entityType, entityId, detail } = {}) {
  return db.auditLog.create({
    data: {
      tenantId: ctx.tenantId ?? null,
      actor: ctx.actor ?? 'system',
      action, entityType, entityId: entityId ? String(entityId) : null,
      detail: detail ?? undefined,
      requestId: ctx.requestId ?? null,
    },
  });
}
