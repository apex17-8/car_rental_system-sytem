// src/auth/dto/register.dto.ts
import {
  IsString,
  IsEmail,
  IsEnum,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { UserRole } from '../../user/dto/create-user.dto';

export class RegisterDto {
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(255)
  password: string;

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
  @IsEnum(UserRole)
  role?: UserRole = UserRole.CUSTOMER;
}
