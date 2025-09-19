import cors from 'cors';

const { CORS_ORIGIN } = process.env;

export const corsMiddleware = cors({
  origin: CORS_ORIGIN?.split(',').map(s => s.trim()),
  credentials: true
});
