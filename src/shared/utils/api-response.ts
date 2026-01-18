export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiPaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: any;
}

export const success = <T>(data: T, message?: string): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export const paginated = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): ApiPaginatedResponse<T> => ({
  success: true,
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
});

export const error = (message: string, errors?: any): ApiErrorResponse => ({
  success: false,
  message,
  errors,
});
