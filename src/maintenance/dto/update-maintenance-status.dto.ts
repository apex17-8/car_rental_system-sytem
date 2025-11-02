// src/maintenance/dto/update-maintenance-status.dto.ts
import { IsEnum } from 'class-validator';
import { MaintenanceStatus } from '../entities/maintenance.entity';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;
}
