// src/auth/dto/register.dto.ts
import {
  IsString,
  IsEmail,
  IsEnum,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { UserRole } from '../../user/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
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
  role?: UserRole;
}
