export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
  errors?: Array<{ field?: string; message: string }>;
}

