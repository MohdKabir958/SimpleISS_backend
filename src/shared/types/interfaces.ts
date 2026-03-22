import { Role } from './enums';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  restaurantId: string | null;
}

export interface RequestContext {
  user: JwtPayload;
  restaurantId: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  changedBy: string | null;
}
