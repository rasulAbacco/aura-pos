import { prisma } from '../../core/database/prisma.js';
import { ipHash } from '../../core/utils/tokens.js';

/** Single source of pricing for the marketing site, signup and renewal pages. */
export const listPublicPlans = () => prisma.subscriptionPlan.findMany({
  where: { isActive: true, isPublic: true }, orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  select: { id: true, code: true, name: true, description: true, interval: true, price: true, currency: true, trialDays: true, maxStaff: true, maxBranches: true, features: true },
});

export const saveContact = (body, ip) => prisma.contactSubmission.create({
  data: { name: body.name, email: body.email, phone: body.phone || null, subject: body.subject, message: body.message, consent: body.consent, ipHash: ipHash(ip), status: body.website ? 'SPAM' : 'NEW' },
});
