import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { getRedis } from '../../config/redis';
import { sendSuccess } from '../../shared/utils/response';

export class HealthController {
  async health(_req: Request, res: Response): Promise<void> {
    const uptime = process.uptime();
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    try {
      const redis = getRedis();
      if (redis) {
        await redis.ping();
        redisStatus = 'connected';
      }
    } catch {
      redisStatus = 'disconnected';
    }

    const status = dbStatus === 'connected' ? 'healthy' : 'unhealthy';

    sendSuccess(res, {
      status,
      uptime: Math.floor(uptime),
      version: '1.0.0',
      services: {
        database: dbStatus,
        redis: redisStatus,
        websocket: 'running',
      },
    });
  }

  async ready(_req: Request, res: Response): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redis = getRedis();
      if (redis) {
        await redis.ping();
      }
      sendSuccess(res, { status: 'ready' });
    } catch {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service is not ready',
          statusCode: 503,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async live(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { status: 'alive' });
  }
}
