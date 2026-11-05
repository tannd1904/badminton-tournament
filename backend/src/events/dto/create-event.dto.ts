import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PlayType, EventFormat } from '@prisma/client';

export class CreateEventDto {
  @IsString({ message: 'Mã giải đấu không được để trống' })
  @IsNotEmpty()
  tournamentId: string;

  @IsString({ message: 'Tên nội dung thi đấu phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên nội dung không được để trống' })
  name: string;

  @IsOptional()
  @IsString()
  groupType?: string;

  @IsEnum(PlayType, { message: 'Loại hình thi đấu không hợp lệ (SINGLE_MEN, DOUBLE_MEN, ...)' })
  playType: PlayType;

  @IsEnum(EventFormat, { message: 'Thể thức không hợp lệ (KNOCKOUT, ROUND_ROBIN, ...)' })
  format: EventFormat;

  @IsOptional()
  @IsNumber()
  @Min(0)
  entryFee?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  autoDraw?: boolean;

  @IsOptional()
  @IsBoolean()
  hasThirdPlaceMatch?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  winPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  losePoints?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSetsToWin?: number;
}

