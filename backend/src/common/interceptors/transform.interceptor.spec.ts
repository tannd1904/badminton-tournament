import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap raw data into standard ApiResponse', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockHandler: CallHandler = {
      handle: () => of({ foo: 'bar' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        message: 'Operation completed successfully',
        data: { foo: 'bar' },
      });
      done();
    });
  });

  it('should preserve existing ApiResponse format', (done) => {
    const mockContext = {} as ExecutionContext;
    const customResponse = {
      success: true,
      message: 'Custom message',
      data: [1, 2, 3],
    };
    const mockHandler: CallHandler = {
      handle: () => of(customResponse),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual(customResponse);
      done();
    });
  });
});

