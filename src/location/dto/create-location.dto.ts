// src/location/dto/create-location.dto.ts
import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @MaxLength(255)
  location_name: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(20)
  contact_number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manager_name?: string;

  @IsOptional()
  @IsString()
  opening_time?: string;

  @IsOptional()
  @IsString()
  closing_time?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
