export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
  errors: null;
}

export interface ApiErrorResponse {
  data: null;
  meta: null;
  errors: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export function success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { data, meta, errors: null };
}

export function paginated<T>(data: T[], total: number, limit: number, offset: number): ApiResponse<T[]> {
  return {
    data,
    meta: { total, limit, offset },
    errors: null,
  };
}

export function error(code: string, message: string, details?: Record<string, string[]>): ApiErrorResponse {
  return {
    data: null,
    meta: null,
    errors: { code, message, details },
  };
}
