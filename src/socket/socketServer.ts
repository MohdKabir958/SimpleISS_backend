import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedis, connectRedis } from '../config/redis';
import { logger } from '../config/logger';
import { socketAuthMiddleware, customerSocketAuthMiddleware } from './socketAuth';
import { setupKitchenHandlers } from './kitchenHandler';
import { setupCustomerHandlers } from './customerHandler';
import { config } from '../config/env';

let io: Server;

export async function initSocketServer(httpServer: HttpServer): Promise<Server> {
  // Ensure Redis is connected before hooking it to Socket.io
  if (!getRedis()) {
    await connectRedis();
  }
  
  const pubClient = getRedis();
  
  io = new Server(httpServer, {
    cors: {
      origin: config.isDev
        ? [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/]
        : config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
  });

  if (pubClient) {
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter hooked up');
  } else {
    logger.warn('Socket.io running IN-MEMORY (Redis not available). Not suitable for multi-instance deployment.');
  }

  // 1. Kitchen Namespace
  const kitchenNs = io.of('/kitchen');
  kitchenNs.use(socketAuthMiddleware);
  
  kitchenNs.on('connection', (socket) => {
    logger.info(`Kitchen staff connected: ${socket.id}`, { userId: socket.data.user.userId, restaurantId: socket.data.user.restaurantId });
    // Join a room specifically for this restaurant's kitchen team
    socket.join(`restaurant_${socket.data.user.restaurantId}`);
    setupKitchenHandlers(io, socket);
    
    socket.on('disconnect', () => {
      logger.info(`Kitchen staff disconnected: ${socket.id}`);
    });
  });

  // 2. Customer Namespace
  const customerNs = io.of('/customer');
  customerNs.use(customerSocketAuthMiddleware); // Verify session ID
  
  customerNs.on('connection', (socket) => {
    const sessionId = socket.data.sessionId;
    logger.info(`Customer connected to session ${sessionId}: ${socket.id}`);
    
    socket.join(`session_${sessionId}`);
    setupCustomerHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`Customer disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized.');
  }
  return io;
}
