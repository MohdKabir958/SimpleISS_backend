import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import { sendSuccess } from '../../shared/utils/response';

const service = new ReportService();

export class ReportController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.getDashboardStats(req.restaurantId!)); } catch (e) { next(e); }
  }

  async getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getRevenueReport(
        req.restaurantId!,
        req.query.startDate as string,
        req.query.endDate as string
      ));
    } catch (e) { next(e); }
  }

  async getPopularItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      sendSuccess(res, await service.getPopularItems(req.restaurantId!, limit));
    } catch (e) { next(e); }
  }
}
