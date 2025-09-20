import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function writeAudit(entry: {
  actorUserId?: string;
  entity: string;
  entityId?: string;
  action: string;
  ip?: string;
  userAgent?: string;
  before?: any;
  after?: any;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      action: entry.action,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null
    }
  });
}
