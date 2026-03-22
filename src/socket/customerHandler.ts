import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';

export const setupCustomerHandlers = (io: Server, socket: Socket) => {
  // const sessionId = socket.data.sessionId;

  // Most of the customer interactions are via REST.
  // The customer namespace is mainly for listening to server-sent events.
  
  socket.on('request_waiter', (payload, callback) => {
    // Forward the request to the kitchen/admin namespace
    // In a full implementation, you'd find the tableId from the session
    // and broadcast `waiter_called` to `restaurant_{restaurantId}` room.
    logger.info('Customer requested waiter via socket', { sessionId: socket.data.sessionId });
    if (callback) callback({ success: true });
  });
};
