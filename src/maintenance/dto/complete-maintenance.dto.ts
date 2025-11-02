// src/maintenance/dto/complete-maintenance.dto.ts
import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class CompleteMaintenanceDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  actual_cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
