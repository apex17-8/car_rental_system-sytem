// src/payment/dto/process-refund.dto.ts
import { IsNumber, IsPositive, IsString } from 'class-validator';

export class ProcessRefundDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  reason: string;
}
