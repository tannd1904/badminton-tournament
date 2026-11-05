import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClubDto {
  @IsString({ message: 'Tên câu lạc bộ phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên câu lạc bộ không được để trống' })
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

