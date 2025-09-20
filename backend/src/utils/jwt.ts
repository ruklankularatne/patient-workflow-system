import jwt from 'jsonwebtoken';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from '../configs/security';

export type JwtPayload = { sub: string; role: string };

export function signAccess(payload: JwtPayload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: ACCESS_TTL_SECONDS });
}
export function signRefresh(payload: JwtPayload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, { expiresIn: REFRESH_TTL_SECONDS });
}
export function verifyAccess(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
}
export function verifyRefresh(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
}
