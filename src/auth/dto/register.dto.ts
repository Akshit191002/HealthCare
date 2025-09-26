import { IsEmail, IsOptional, IsString, MinLength, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Pass@123', description: 'User password', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({ example: 'doctor', description: 'Role of the user', enum: Role })
  role?: Role;
}
