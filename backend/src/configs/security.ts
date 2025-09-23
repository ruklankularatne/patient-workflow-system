export const ACCESS_COOKIE_NAME = 'pws_access';
export const REFRESH_COOKIE_NAME = 'pws_refresh';
export const COOKIE_SECURE = false; // set true in prod
export const COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';
export const ACCESS_TTL_SECONDS = 60 * 15;
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;
