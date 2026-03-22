import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) {
          logger.warn('Redis: Max retries reached, running without Redis');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error', { message: err.message });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    await redis.connect();
  } catch (error) {
    logger.warn('Redis connection failed, running without Redis cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    redis = null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}
