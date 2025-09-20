import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// JWT Configuration with proper fallbacks
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-key-for-development-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development-only';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify access token and return payload
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify refresh token and return user ID
 */
export function verifyRefreshToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Extract token from cookies
 */
export function extractTokenFromCookies(cookies: Record<string, string>, tokenName: string): string | null {
  return cookies[tokenName] || null;
}

/**
 * Cookie configuration for tokens
 */
export const COOKIE_CONFIG = {
  accessToken: {
    name: 'accessToken',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
      path: '/',
    },
  },
  refreshToken: {
    name: 'refreshToken',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    },
  },
};

// Legacy support - keeping old function names but updating implementation
export type JwtPayload = JWTPayload;

export function signAccess(payload: { sub: string; role: string }) {
  const newPayload = {
    userId: payload.sub,
    email: '', // Will be filled by auth service
    role: payload.role as Role,
    fullName: '', // Will be filled by auth service
  };
  return generateTokens(newPayload).accessToken;
}

export function signRefresh(payload: { sub: string; role: string }) {
  return jwt.sign({ userId: payload.sub }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function verifyAccess(token: string): { sub: string; role: string } {
  const payload = verifyAccessToken(token);
  return { sub: payload.userId, role: payload.role };
}

export function verifyRefresh(token: string): { sub: string; role: string } {
  const payload = verifyRefreshToken(token);
  return { sub: payload.userId, role: '' }; // Role will be fetched from database
}
