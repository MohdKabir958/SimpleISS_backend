import { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service';
import { sendSuccess } from '../../shared/utils/response';

const service = new SessionService();

export class SessionController {
  // Public
  async createOrResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await service.createOrResumeSession(req.params.slug as string, req.params.tableId as string);
      sendSuccess(res, session, 'Session retrieved or created');
    } catch (e) { next(e); }
  }

  // Public
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await service.getSessionStatus(req.params.sessionId as string);
      sendSuccess(res, status);
    } catch (e) { next(e); }
  }

  // Admin
  async getActiveSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getActiveSessions(req.restaurantId!));
    } catch (e) { next(e); }
  }

  // Admin
  async completePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await service.completePaymentBySession(req.restaurantId!, req.params.sessionId as string, req.body.paymentMethod);
      sendSuccess(res, payment, 'Payment completed via session');
    } catch (e) { next(e); }
  }

  // Admin
  async closeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await service.closeSession(req.restaurantId!, req.params.sessionId as string, req.body.status);
      sendSuccess(res, session, 'Session closed successfully');
    } catch (e) { next(e); }
  }
}
