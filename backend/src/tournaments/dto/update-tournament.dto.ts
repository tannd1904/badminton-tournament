import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TournamentVisibility } from '@prisma/client';

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sportId?: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  ruleContent?: string;

  @IsOptional()
  @IsString()
  ruleAttachmentUrl?: string;

  @IsOptional()
  @IsDateString()
  registrationOpenAt?: string;

  @IsOptional()
  @IsDateString()
  registrationCloseAt?: string;

  @IsOptional()
  @IsDateString()
  tournamentStartAt?: string;

  @IsOptional()
  @IsDateString()
  tournamentEndAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEventsPerPlayer?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  matchIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  defaultMatchDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCourts?: number;

  @IsOptional()
  @IsEnum(TournamentVisibility)
  visibility?: TournamentVisibility;
}
