import { type Request, type Response, type NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { verifyAccessToken, extractTokenFromHeader, extractTokenFromCookies, COOKIE_CONFIG } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// We'll configure cookie parser in the main app file instead
export function withCookies() {
  return (req: Request, res: Response, next: NextFunction) => next();
}

/**
 * Authentication middleware that validates JWT tokens from cookies or Authorization header
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | null = null;

    // Try to get token from cookies first (primary method)
    if (req.cookies) {
      token = extractTokenFromCookies(req.cookies, COOKIE_CONFIG.accessToken.name);
    }

    // Fallback to Authorization header
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      logger.warn('Authentication failed: No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify the token
    const payload = verifyAccessToken(token);

    // Fetch the user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        Doctor: true,
      },
    });

    if (!user) {
      logger.warn('Authentication failed: User not found');
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.',
      });
    }

    if (!user.isActive) {
      logger.warn('Authentication failed: User account is inactive');
      return res.status(401).json({
        success: false,
        message: 'Access denied. Account is inactive.',
      });
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      doctorId: user.Doctor?.id,
    };

    logger.info('User authenticated successfully');

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Authentication middleware error: ${errorMessage}`);

    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.',
    });
  }
}

// Legacy support - keeping old function names
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  return authenticateToken(req, res, next);
}

/**
 * Authorization middleware factory that checks if user has required role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error('Authorization failed: User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions');
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    logger.info('User authorized successfully');

    next();
  };
}

/**
 * Middleware to check if user can access their own resources or admin can access any
 */
export function requireOwnershipOrAdmin(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const targetUserId = req.params[userIdParam];
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.role === Role.superadmin || req.user.role === Role.admin;

    if (!isOwner && !isAdmin) {
      logger.warn('Authorization failed: Not owner or admin');
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
      });
    }

    next();
  };
}
