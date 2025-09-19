import http from 'http';
import app from './app';
import { logger } from './utils/logger';

const port = Number(process.env.PORT || 8080);
const server = http.createServer(app);

server.listen(port, () => {
  logger.info(`API listening on :${port}`);
});
