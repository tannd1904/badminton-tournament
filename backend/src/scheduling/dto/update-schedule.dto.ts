import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMatchScheduleDto {
  @IsString({ message: 'Mã sân thi đấu không được để trống' })
  @IsNotEmpty()
  courtId: string;

  @IsDateString({}, { message: 'Thời gian bắt đầu phải là chuẩn ISO date' })
  @IsNotEmpty()
  scheduledStartTime: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  estimatedDurationMinutes?: number;
}

export class ToggleLockTimeDto {
  @IsBoolean()
  isTimeLocked: boolean;
}

export class RecalculateOverrunDto {
  @IsString()
  @IsNotEmpty()
  delayedMatchId: string;

  @IsDateString()
  @IsNotEmpty()
  actualEndTime: string;
}

