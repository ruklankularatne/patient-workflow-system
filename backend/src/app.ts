import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

import api from './routes/index.js';
import { httpLogger } from './utils/logger.js';

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use(httpLogger);
app.use(helmet());
app.use(compression());
app.use(cookieParser()); // Add cookie parser middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- CORS ----
const defaultOrigin = 'http://localhost:3000';
const corsOrigins =
  process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) ??
  [defaultOrigin];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openapiCandidates = [
  path.resolve(__dirname, 'docs', 'openapi.yaml'),
  path.resolve(__dirname, '..', 'docs', 'openapi.yaml'),
  path.resolve(process.cwd(), 'src', 'docs', 'openapi.yaml'),
  path.resolve(process.cwd(), 'docs', 'openapi.yaml'),
];

const openapiPath = openapiCandidates.find((p) => fs.existsSync(p));
if (!openapiPath) {
  throw new Error(
    `openapi.yaml not found. Checked:\n${openapiCandidates.join('\n')}`
  );
}

const swaggerDocument = YAML.load(openapiPath);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ---- API ----
app.use('/api/v1', api);

export default app;
