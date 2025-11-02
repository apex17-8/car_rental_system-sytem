import {
  IsDate,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInsuranceDto {
  @IsNumber()
  @IsPositive()
  car_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  insurance_provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  policy_number: string;

  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @IsDate()
  @Type(() => Date)
  end_date: Date;

  @IsNumber()
  @IsPositive()
  premium_amount: number;

  @IsOptional()
  @IsString()
  coverage_details?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
