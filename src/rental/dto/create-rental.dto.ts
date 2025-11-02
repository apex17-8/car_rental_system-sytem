// src/rental/dto/create-rental.dto.ts
import {
  IsDate,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RentalStatus } from '../entities/rental.entity';

export class CreateRentalDto {
  @IsNumber()
  @IsPositive()
  car_id: number;

  @IsNumber()
  @IsPositive()
  customer_id: number;

  @IsDate()
  @Type(() => Date)
  rental_start_date: Date;

  @IsDate()
  @Type(() => Date)
  rental_end_date: Date;

  @IsNumber()
  @IsPositive()
  pickup_location_id: number;

  @IsNumber()
  @IsPositive()
  return_location_id: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  reservation_id?: number;

  @IsOptional()
  @IsEnum(RentalStatus)
  status?: RentalStatus;
}
