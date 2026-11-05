import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class RejectRegistrationDto {
  @IsString({ message: 'Lý do từ chối phải là chuỗi' })
  @IsNotEmpty({ message: 'Vui lòng nhập lý do từ chối' })
  rejectionReason: string;
}

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  transactionReference?: string;
}
