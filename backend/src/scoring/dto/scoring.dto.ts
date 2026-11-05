import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';

export enum TeamSideEnum {
  TEAM_A = 'TEAM_A',
  TEAM_B = 'TEAM_B',
}

export class RecordPointDto {
  @IsNotEmpty({ message: 'Đội ghi điểm không được để trống' })
  @IsEnum(TeamSideEnum, { message: 'Đội ghi điểm phải là TEAM_A hoặc TEAM_B' })
  team: TeamSideEnum;

  @IsNotEmpty({ message: 'Idempotency key không được để trống' })
  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  serverUserId?: string;

  @IsOptional()
  @IsString()
  receiverUserId?: string;
}

export class WalkoverDto {
  @IsNotEmpty({ message: 'Đội thắng walkover không được để trống' })
  @IsEnum(TeamSideEnum, { message: 'Đội thắng phải là TEAM_A hoặc TEAM_B' })
  winnerTeam: TeamSideEnum;

  @IsNotEmpty({ message: 'Lý do bỏ cuộc không được để trống' })
  @IsString()
  reason: string;
}

export class StartMatchDto {
  @IsOptional()
  @IsEnum(TeamSideEnum, { message: 'Đội giao cầu đầu tiên phải là TEAM_A hoặc TEAM_B' })
  initialServingTeam?: TeamSideEnum;
}

