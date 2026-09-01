export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly params?: Record<string, string | number>;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    code?: string,
    params?: Record<string, string | number>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.params = params;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code?: string, params?: Record<string, string | number>): ApiError {
    return new ApiError(400, message, true, code, params);
  }

  static unauthorized(
    message: string = 'Não autorizado',
    code?: string,
    params?: Record<string, string | number>
  ): ApiError {
    return new ApiError(401, message, true, code, params);
  }

  static tokenExpired(): ApiError {
    return new ApiError(401, 'Token expirado', true, 'TOKEN_EXPIRED');
  }

  static forbidden(message: string = 'Acesso negado', code?: string, params?: Record<string, string | number>): ApiError {
    return new ApiError(403, message, true, code, params);
  }

  static notFound(
    message: string = 'Recurso não encontrado',
    code?: string,
    params?: Record<string, string | number>
  ): ApiError {
    return new ApiError(404, message, true, code, params);
  }

  static conflict(message: string, code?: string, params?: Record<string, string | number>): ApiError {
    return new ApiError(409, message, true, code, params);
  }

  static unprocessable(message: string, code?: string, params?: Record<string, string | number>): ApiError {
    return new ApiError(422, message, true, code, params);
  }

  static internal(message: string = 'Erro interno do servidor', code?: string): ApiError {
    return new ApiError(500, message, false, code);
  }
}
