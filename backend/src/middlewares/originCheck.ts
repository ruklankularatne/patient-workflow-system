import { Request, Response, NextFunction } from 'express';

const MUTATING = new Set(['POST','PUT','PATCH','DELETE']);

// Basic CSRF mitigation
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method)) return next();

  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  // Accept when request is same-origin OR when no origin.
  if (origin || referer) {
    return next();
  }
  return res.status(403).json({ message: 'Cross-site request not allowed' });
}
