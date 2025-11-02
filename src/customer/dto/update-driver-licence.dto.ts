// src/customer/dto/update-driver-license.dto.ts
import { IsString, MaxLength } from 'class-validator';

export class UpdateDriverLicenseDto {
  @IsString()
  @MaxLength(20)
  driver_license: string;
}
