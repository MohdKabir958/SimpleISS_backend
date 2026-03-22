import { Request, Response, NextFunction } from 'express';
import { TableService } from './table.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';

const service = new TableService();

export class TableController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.listTables(req.restaurantId!)); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendCreated(res, await service.createTable(req.restaurantId!, req.body)); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.updateTable(req.restaurantId!, req.params.tableId as string, req.body)); } catch (e) { next(e); }
  }
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await service.deleteTable(req.restaurantId!, req.params.tableId as string); sendSuccess(res, null, 'Table deleted'); } catch (e) { next(e); }
  }
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.getTableSession(req.restaurantId!, req.params.tableId as string)); } catch (e) { next(e); }
  }
}
