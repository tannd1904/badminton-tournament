import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSportDto {
  @IsString({ message: 'Tên môn thể thao phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên môn thể thao không được để trống' })
  name: string;

  @IsString({ message: 'Mã môn thể thao phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã môn thể thao không được để trống' })
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}

