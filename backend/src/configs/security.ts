import helmet from 'helmet';

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' }
});
