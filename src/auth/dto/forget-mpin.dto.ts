import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgetMpinDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}