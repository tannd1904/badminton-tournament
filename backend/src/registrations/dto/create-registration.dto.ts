import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @IsString({ message: 'Mã nội dung không được để trống' })
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  // Doubles Partner Information
  @IsOptional()
  @IsString()
  partnerUserId?: string;

  @IsOptional()
  @IsString()
  partnerName?: string;

  @IsOptional()
  @IsString()
  partnerPhone?: string;
}

