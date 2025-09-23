import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { logger } from '../utils/logger.js';

// Define AuditAction enum manually to match Prisma schema
export enum AuditAction {
  create = 'create',
  update = 'update',
  delete = 'delete'
}

const prisma = new PrismaClient();

export interface AuditLogEntry {
  actorUserId?: string;
  entity: string;
  entityId?: string;
  action: AuditAction;
  before?: any;
  after?: any;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId || null,
        entity: entry.entity,
        entityId: entry.entityId || null,
        action: entry.action,
        before: entry.before || null,
        after: entry.after || null,
        ip: entry.ip || null,
        userAgent: entry.userAgent || null,
      },
    });

    logger.info(`Audit log created: ${entry.action} on ${entry.entity}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to create audit log: ${errorMessage}`);
    // Don't throw error to avoid disrupting business logic
  }
}

/**
 * Log a CREATE operation
 */
export async function logCreate(
  entity: string,
  entityId: string,
  data: any,
  req?: Request
): Promise<void> {
  await createAuditLog({
    actorUserId: req?.user?.id,
    entity,
    entityId,
    action: AuditAction.create,
    after: data,
    requestId: req?.requestId,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
  });
}

/**
 * Log an UPDATE operation
 */
export async function logUpdate(
  entity: string,
  entityId: string,
  before: any,
  after: any,
  req?: Request
): Promise<void> {
  await createAuditLog({
    actorUserId: req?.user?.id,
    entity,
    entityId,
    action: AuditAction.update,
    before,
    after,
    requestId: req?.requestId,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
  });
}

/**
 * Log a DELETE operation
 */
export async function logDelete(
  entity: string,
  entityId: string,
  data: any,
  req?: Request
): Promise<void> {
  await createAuditLog({
    actorUserId: req?.user?.id,
    entity,
    entityId,
    action: AuditAction.delete,
    before: data,
    requestId: req?.requestId,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(
  entity?: string,
  entityId?: string,
  limit: number = 50,
  offset: number = 0
) {
  const where: any = {};
  
  if (entity) {
    where.entity = entity;
  }
  
  if (entityId) {
    where.entityId = entityId;
  }

  return await prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
}

/**
 * Get audit logs for a specific user's actions
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.auditLog.findMany({
    where: {
      actorUserId: userId,
    },
    include: {
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
}

/**
 * Get audit statistics
 */
export async function getAuditStats(dateFrom?: Date, dateTo?: Date) {
  const where: any = {};
  
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [totalLogs, actionStats, entityStats] = await Promise.all([
    // Total count
    prisma.auditLog.count({ where }),
    
    // Group by action
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
    }),
    
    // Group by entity
    prisma.auditLog.groupBy({
      by: ['entity'],
      where,
      _count: {
        entity: true,
      },
    }),
  ]);

  return {
    totalLogs,
    actionStats: actionStats.map(stat => ({
      action: stat.action,
      count: stat._count.action,
    })),
    entityStats: entityStats.map(stat => ({
      entity: stat.entity,
      count: stat._count.entity,
    })),
  };
}

/**
 * Clean up old audit logs (for maintenance)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  logger.info(`Cleaned up ${result.count} old audit logs older than ${daysToKeep} days`);
  return result.count;
}

// Legacy support - keeping the old function name
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
  await createAuditLog({
    ...entry,
    action: entry.action as AuditAction,
  });
}
