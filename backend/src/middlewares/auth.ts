import { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { ACCESS_COOKIE_NAME } from '../configs/security';
import { verifyAccess } from '../utils/jwt';

export function withCookies() {
  return cookieParser();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req as any).cookies?.[ACCESS_COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = verifyAccess(token);
    (req as any).user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user;
    if (!u || !roles.includes(u.role)) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}
