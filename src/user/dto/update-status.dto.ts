// src/user/dto/update-status.dto.ts
import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @IsBoolean()
  is_active: boolean;
}
