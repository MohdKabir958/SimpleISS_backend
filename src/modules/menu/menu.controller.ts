import { Request, Response, NextFunction } from 'express';
import { MenuService } from './menu.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response';
import {
  createMenuItemMultipartSchema,
  updateMenuItemMultipartSchema,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from './menu.validator';

const service = new MenuService();

export class MenuController {
  async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.listCategories(req.restaurantId!)); }
    catch (e) { next(e); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendCreated(res, await service.createCategory(req.restaurantId!, req.body)); }
    catch (e) { next(e); }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.updateCategory(req.restaurantId!, req.params.catId as string, req.body)); }
    catch (e) { next(e); }
  }

  async reorderCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.reorderCategory(req.restaurantId!, req.params.catId as string, req.body.sortOrder)); }
    catch (e) { next(e); }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await service.deleteCategory(req.restaurantId!, req.params.catId as string); sendSuccess(res, null, 'Category deleted'); }
    catch (e) { next(e); }
  }

  async listItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await service.listItems(
        req.restaurantId!,
        req.query.category as string,
        req.query.available === 'true' ? true : req.query.available === 'false' ? false : undefined,
        req.query.search as string
      );
      sendSuccess(res, items);
    } catch (e) { next(e); }
  }

  async getItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.getItem(req.restaurantId!, req.params.itemId as string)); }
    catch (e) { next(e); }
  }

  async createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
      const body = createMenuItemMultipartSchema.parse(req.body);
      const payload: CreateMenuItemInput = {
        ...body,
        description: body.description === null ? undefined : body.description,
      };
      sendCreated(res, await service.createItem(req.restaurantId!, payload, imageUrl));
    } catch (e) { next(e); }
  }

  async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
      const body = updateMenuItemMultipartSchema.parse(req.body);
      const payload: UpdateMenuItemInput = {
        ...body,
        description: body.description === null ? undefined : body.description,
      };
      sendSuccess(res, await service.updateItem(req.restaurantId!, req.params.itemId as string, payload, imageUrl));
    } catch (e) { next(e); }
  }

  async toggleAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.toggleAvailability(req.restaurantId!, req.params.itemId as string, req.body.isAvailable)); }
    catch (e) { next(e); }
  }

  async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await service.deleteItem(req.restaurantId!, req.params.itemId as string); sendSuccess(res, null, 'Item deleted'); }
    catch (e) { next(e); }
  }

  async getPublicMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await service.getPublicMenu(req.params.slug as string, req.params.tableId as string)); }
    catch (e) { next(e); }
  }
}
