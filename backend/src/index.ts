import 'dotenv/config';
import app from './app.js';
import { logger } from './utils/logger.js';

const port = Number(process.env.PORT || 8080);

const server = app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
  logger.info(`API docs available at http://localhost:${port}/docs`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});