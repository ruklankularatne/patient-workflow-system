import { PrismaClient, AuditLog } from '@prisma/client';
const prisma = new PrismaClient();

export type AuditParams = {
  actorUserId?: string | null;
  entity: string;
  entityId?: string | null;
  action: 'create'|'update'|'delete'|'login'|'logout';
  ip?: string | null;
  userAgent?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

export async function writeAudit(entry: AuditParams): Promise<AuditLog> {
  return prisma.auditLog.create({
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
