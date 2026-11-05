import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If handler already formatted as standard ApiResponse
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          'message' in res
        ) {
          return res;
        }

        // If handler returned standard { message, data } envelope
        if (res && typeof res === 'object' && 'data' in res && 'message' in res) {
          return {
            success: true,
            message: res.message,
            data: res.data,
            ...(res.meta ? { meta: res.meta } : {}),
          };
        }

        // Check if response contains metadata
        if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
          return {
            success: true,
            message: 'Operation completed successfully',
            data: res.data,
            meta: res.meta,
          };
        }

        return {
          success: true,
          message: 'Operation completed successfully',
          data: res ?? null,
        };
      }),
    );
  }
}

