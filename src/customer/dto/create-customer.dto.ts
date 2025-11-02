// src/customer/dto/create-customer.dto.ts
import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsString()
  @MaxLength(15)
  phone_number: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  driver_license?: string;

  @IsOptional()
  @IsNumber()
  user_id?: number;
}
