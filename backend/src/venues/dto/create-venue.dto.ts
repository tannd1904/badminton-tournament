import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVenueDto {
  @IsString({ message: 'Tên địa điểm phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên địa điểm không được để trống' })
  name: string;

  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;

  @IsString({ message: 'Thành phố phải là chuỗi' })
  @IsNotEmpty({ message: 'Thành phố không được để trống' })
  city: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

