// src/car/dto/create-car.dto.ts
import {
  IsString,
  IsNumber,
  IsEnum,
  IsPositive,
  IsOptional,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';
import { CarType, FuelType } from '../entities/car.entity';

export class CreateCarDto {
  @IsString()
  @MaxLength(100)
  car_model: string;

  @IsString()
  @MaxLength(100)
  car_manufacturer: string;

  @IsString()
  @MaxLength(4)
  year: string;

  @IsString()
  @MaxLength(50)
  color: string;

  @IsEnum(CarType)
  car_type: CarType;

  @IsEnum(FuelType)
  fuel_type: FuelType;

  @IsNumber()
  @IsPositive()
  rental_rate: number;

  @IsString()
  @MaxLength(20)
  license_plate: string;

  @IsOptional()
  @IsNumber()
  current_location_id?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  doors?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  engine_size?: number;

  @IsOptional()
  @IsString()
  features?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  image_url?: string;
}
