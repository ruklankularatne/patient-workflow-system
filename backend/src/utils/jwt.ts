const {
  JWT_SECRET,
  JWT_EXPIRES_IN = '15m',
  REFRESH_JWT_SECRET,
  REFRESH_JWT_EXPIRES_IN = '7d',
  COOKIE_NAME = 'access_token',
  REFRESH_COOKIE_NAME: REFRESH_COOKIE_ENV = 'refresh_token',
  COOKIE_SECURE = 'true',
  COOKIE_SAMESITE = 'Strict'
} = process.env;

export function signAccessToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN });
}
export function signRefreshToken(payload: object) {
  return jwt.sign(payload, REFRESH_JWT_SECRET as string, { expiresIn: REFRESH_JWT_EXPIRES_IN });
}

export function cookieOptions() {
  const secure = COOKIE_SECURE === 'true';
  const sameSite = COOKIE_SAMESITE as 'Strict' | 'Lax' | 'None';
  return { httpOnly: true, secure, sameSite, path: '/', maxAge: 1000 * 60 * 60 * 24 * 7 } as const;
}

export const ACCESS_COOKIE_NAME = COOKIE_NAME as string;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE_ENV as string;
