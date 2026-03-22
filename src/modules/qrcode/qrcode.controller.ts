import { Request, Response, NextFunction } from 'express';
import { QrcodeService } from './qrcode.service';
import { sendSuccess } from '../../shared/utils/response';

const service = new QrcodeService();

export class QrcodeController {
  async downloadForTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = req.query.format === 'svg' ? 'svg' : 'png';
      const file = await service.generateForTable(req.restaurantId!, req.params.tableId as string, format);
      
      res.setHeader('Content-Type', file.type);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.data);
    } catch (e) { next(e); }
  }

  async getAllForRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.generateAllForRestaurant(req.restaurantId!));
    } catch (e) { next(e); }
  }
}
