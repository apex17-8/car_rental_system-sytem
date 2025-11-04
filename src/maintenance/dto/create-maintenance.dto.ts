import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MaintenanceType,
  MaintenanceStatus,
} from '../entities/maintenance.entity';

export class CreateMaintenanceDto {
  @IsNumber()
  @IsPositive()
  car_id: number;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsDate()
  @Type(() => Date)
  maintenance_date: Date;

  @IsNumber()
  @IsPositive()
  cost: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}
