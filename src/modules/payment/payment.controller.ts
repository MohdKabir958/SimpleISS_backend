import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import { getSocketServer } from '../../socket/socketServer';

const service = new PaymentService();

export class PaymentController {
  async requestBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await service.requestBill(req.params.sessionId as string, req.body);
      
      // Notify admin/staff via socket that a bill was requested
      const io = getSocketServer();
      io.of('/kitchen')
        .to(`restaurant_${payment.restaurantId}`)
        .emit('bill_requested', payment);
      
      sendCreated(res, payment, 'Bill requested successfully');
    } catch (e) { next(e); }
  }

  async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getRestaurantPayments(req.restaurantId!));
    } catch (e) { next(e); }
  }

  async completePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await service.completePayment(
        req.restaurantId!,
        req.params.paymentId as string,
        req.body.paymentMethod
      );
      sendSuccess(res, payment, 'Payment recorded and session closed');
    } catch (e) { next(e); }
  }
}
