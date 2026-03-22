import { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, message = 'Success', statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}

export function sendCreated(res: Response, data: unknown, message = 'Created successfully'): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  pagination: { page: number; limit: number; total: number },
  message = 'Success'
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    message,
    timestamp: new Date().toISOString(),
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      statusCode,
      details,
    },
    timestamp: new Date().toISOString(),
  });
}
