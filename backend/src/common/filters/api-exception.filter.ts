import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Erro interno. Tente novamente.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (typeof obj.code === 'string') code = obj.code;
        else if (status === 401) code = 'UNAUTHORIZED';
        else if (status === 403) code = 'FORBIDDEN';
        else if (status === 404) code = 'NOT_FOUND';
        else if (status === 400) code = 'BAD_REQUEST';
        else if (status === 409) code = 'CONFLICT';
        else code = 'HTTP_ERROR';

        if (typeof obj.message === 'string') message = obj.message;
        else if (Array.isArray(obj.message)) {
          message = 'Dados inválidos';
          details = obj.message;
        } else if (typeof obj.error === 'string' && !obj.message) {
          message = obj.error;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      if (exception.message === 'TENANT_REQUIRED') {
        status = HttpStatus.BAD_REQUEST;
        code = 'TENANT_REQUIRED';
        message = 'Tenant obrigatório';
      } else if (exception.message === 'SUPER_ADMIN_TENANT_REQUIRED') {
        status = HttpStatus.BAD_REQUEST;
        code = 'TENANT_REQUIRED';
        message = 'Selecione um estabelecimento';
      }
    }

    response.status(status).json({
      ok: false,
      error: { code, message, details },
    });
  }
}
