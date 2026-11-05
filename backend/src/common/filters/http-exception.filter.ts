import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Array<{ field?: string; message: string }> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;

        if (Array.isArray(resObj.message)) {
          errors = resObj.message.map((msg: string) => {
            const firstSpace = msg.indexOf(' ');
            const field = firstSpace > -1 ? msg.substring(0, firstSpace) : undefined;
            return { field, message: msg };
          });
          message = 'Validation failed';
        } else if (resObj.errors && Array.isArray(resObj.errors)) {
          errors = resObj.errors;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      ...(errors ? { errors } : {}),
      meta: {
        statusCode: status,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(errorResponse);
  }
}

