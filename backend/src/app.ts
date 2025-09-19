import express from 'express';
import cookieParser from 'cookie-parser';
import { httpLogger } from './utils/logger';
import { corsMiddleware } from './configs/cors';
import { helmetMiddleware } from './configs/security';
import { requireSameOrigin } from './middlewares/originCheck';
import api from './routes';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';

const app = express();

// Core
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(httpLogger);
app.use(helmetMiddleware);
app.use(corsMiddleware);

// CSRF/Origin check only on mutating requests
app.use(requireSameOrigin);

// Swagger
const openapi = YAML.load(`${process.cwd()}/src/docs/openapi.yaml`);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));

// API v1
app.use('/api/v1', api);

// Health
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

export default app;
