// src/car/dto/update-availability.dto.ts
import { IsEnum } from 'class-validator';
import { CarAvailability } from '../entities/car.entity';

export class UpdateAvailabilityDto {
  @IsEnum(CarAvailability)
  availability: CarAvailability;
}
