import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '../audit/audit.service.js';

// Define AuditAction enum manually to avoid import issues
export enum AuditAction {
  create = 'create',
  update = 'update',
  delete = 'delete'
}

/**
 * Middleware to automatically log API requests
 */
export function auditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture response
    res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void) {
      // Log the request after response is sent
      logRequest(req, res).catch(error => {
        console.error('Audit logging failed:', error);
      });

      // Call original end function
      return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
    };

    next();
  };
}

/**
 * Log API request with basic information
 */
async function logRequest(req: Request, res: Response) {
  // Only log certain routes and methods
  if (!shouldLogRequest(req)) {
    return;
  }

  const action = getActionFromMethod(req.method);
  if (!action) {
    return;
  }

  try {
    await createAuditLog({
      actorUserId: req.user?.id,
      entity: 'API_REQUEST',
      entityId: req.path,
      action,
      after: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      },
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (error) {
    // Silently fail to avoid disrupting the main flow
    console.error('Failed to log API request:', error);
  }
}

/**
 * Determine if a request should be logged
 */
function shouldLogRequest(req: Request): boolean {
  // Skip health checks and static assets
  const skipPaths = ['/health', '/favicon.ico', '/api/health'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return false;
  }

  // Only log authenticated API routes
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/auth/')) {
    return false;
  }

  // Skip GET requests to reduce log volume (optional)
  if (req.method === 'GET') {
    return false;
  }

  return true;
}

/**
 * Map HTTP method to audit action
 */
function getActionFromMethod(method: string): AuditAction | null {
  switch (method.toUpperCase()) {
    case 'POST':
      return AuditAction.create;
    case 'PUT':
    case 'PATCH':
      return AuditAction.update;
    case 'DELETE':
      return AuditAction.delete;
    default:
      return null;
  }
}

/**
 * Middleware specifically for logging entity operations
 * This should be used in controllers for specific entity logging
 */
export function logEntityOperation(entity: string, action: AuditAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the entity and action for later use in controller
    req.auditContext = {
      entity,
      action,
    };

    next();
  };
}

// Extend Request interface for audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        entity: string;
        action: AuditAction;
      };
    }
  }
}
