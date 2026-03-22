import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(resource: string, code?: string) {
    super(`${resource} not found`, 404, code || `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`);
  }
}
