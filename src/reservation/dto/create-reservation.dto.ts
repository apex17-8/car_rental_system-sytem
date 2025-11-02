// src/reservation/dto/create-reservation.dto.ts
import {
  IsDate,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation.entity';

export class CreateReservationDto {
  @IsNumber()
  @IsPositive()
  car_id: number;

  @IsNumber()
  @IsPositive()
  customer_id: number;

  @IsDate()
  @Type(() => Date)
  pickup_date: Date;

  @IsDate()
  @Type(() => Date)
  return_date: Date;

  @IsNumber()
  @IsPositive()
  pickup_location_id: number;

  @IsNumber()
  @IsPositive()
  return_location_id: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  advance_payment?: number;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
