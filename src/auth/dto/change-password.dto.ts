import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPass123', description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newStrongPass123', description: 'New password', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}