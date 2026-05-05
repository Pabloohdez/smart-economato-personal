import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { method?: string; originalUrl?: string; url?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as { message?: string | string[] })?.message ?? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Error interno del servidor';

    const finalMessage = Array.isArray(message) ? message[0] : message;

    const method = (req as any)?.method ?? 'UNKNOWN';
    const url = (req as any)?.originalUrl ?? (req as any)?.url ?? 'UNKNOWN_URL';
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Log estructurado mínimo para observabilidad (rúbrica).
    if (status >= 500) {
      this.logger.error(`${method} ${url} -> ${status} | ${finalMessage}`, stack);
    } else {
      this.logger.warn(`${method} ${url} -> ${status} | ${finalMessage}`);
    }

    res.status(status).json({
      success: false,
      error: {
        message: finalMessage,
        code: status,
      },
    });
  }
}
