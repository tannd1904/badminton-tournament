import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PlayType, EventFormat, EventStatus } from '@prisma/client';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  groupType?: string;

  @IsOptional()
  @IsEnum(PlayType)
  playType?: PlayType;

  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

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

  @IsOptional()
  @IsBoolean()
  isRegistrationOpen?: boolean;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

