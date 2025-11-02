// src/user/dto/change-password.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  current_password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(255)
  new_password: string;
}
