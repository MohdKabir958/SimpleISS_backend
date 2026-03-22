import http from 'http';
import app from './app';
import { config } from './config/env';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';
import { initSocketServer } from './socket/socketServer';
import { prisma } from './config/database';

const server = http.createServer(app);

async function bootstrap() {
  try {
    // 1. Connect Prisma
    await prisma.$connect();
    logger.info('Database connected');

    // 2. Connect Redis
    await connectRedis();

    // 3. Initialize WebSockets
    await initSocketServer(server);

    // 4. Start listening
    server.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful Shutdown Support
const shutdown = async () => {
  logger.info('Shutting down server gracefully...');
  
  try {
    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    });
  } catch (err) {
    logger.error('Error during shutdown', { err });
    process.exit(1);
  }

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcing server shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap();
