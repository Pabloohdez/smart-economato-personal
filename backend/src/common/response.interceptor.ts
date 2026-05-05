import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const acceptHeader = request?.headers?.accept;
    const accept = Array.isArray(acceptHeader) ? acceptHeader.join(',') : acceptHeader ?? '';

    if (accept.includes('text/event-stream')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data !== undefined && data !== null) {
          return { success: true, data };
        }
        return { success: true };
      }),
    );
  }
}
