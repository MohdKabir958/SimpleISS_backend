import { Request } from 'express';
import { PaginationParams } from '../types/interfaces';

const DEFAULT_RESTAURANT_SORT = ['createdAt', 'name', 'updatedAt'] as const;
const DEFAULT_USER_SORT = ['createdAt', 'email', 'name', 'role'] as const;

export type ExtractPaginationOptions = {
  /** Prevent Prisma orderBy injection — only allowlisted field names */
  sortAllowlist?: readonly string[];
};

export function extractPagination(req: Request, options?: ExtractPaginationOptions): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const allowlist = options?.sortAllowlist ?? DEFAULT_RESTAURANT_SORT;
  const rawSort = (req.query.sort as string) || 'createdAt';
  const sort = allowlist.includes(rawSort) ? rawSort : allowlist[0];
  const order = (req.query.order as string) === 'asc' ? 'asc' as const : 'desc' as const;

  return { page, limit, sort, order };
}

export { DEFAULT_RESTAURANT_SORT, DEFAULT_USER_SORT };

export function getPrismaSkipTake(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}
