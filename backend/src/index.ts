import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { logger } from './utils/logger.js';
import { webSocketService } from './services/websocket.service.js';

const port = Number(process.env.PORT || 8080);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
webSocketService.initialize(server);

server.listen(port, () => {
  logger.info(`Server started on port ${port}`);
  logger.info(`API docs available at http://localhost:${port}/docs`);
  logger.info(`WebSocket server available at ws://localhost:${port}/ws/appointments`);
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