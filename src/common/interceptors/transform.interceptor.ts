import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ResponseEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Interceptor global que envolve todas as respostas no formato:
 * ```json
 * { "data": <response>, "meta": { ... } }
 * ```
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => {
        // Se a resposta já está no formato envelope, não embrulhar
        if (data && typeof data === 'object' && 'data' in data) {
          return data as unknown as ResponseEnvelope<T>;
        }
        return { data };
      }),
    );
  }
}
