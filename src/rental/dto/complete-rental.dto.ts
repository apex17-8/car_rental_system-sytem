// src/rental/dto/complete-rental.dto.ts
import { IsDate, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteRentalDto {
  @IsDate()
  @Type(() => Date)
  actual_return_date: Date;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  final_mileage?: number;
}
