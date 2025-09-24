import { IsEmail, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}


export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({ example: 'doctor', description: 'Role of the user', enum: Role })
  role?: Role; 
}
