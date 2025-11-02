import { IsDate, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class RenewInsuranceDto {
  @IsDate()
  @Type(() => Date)
  new_end_date: Date;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  new_premium?: number;
}
