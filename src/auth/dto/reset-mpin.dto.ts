import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetMpinDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @IsNotEmpty()
    otp: string;

    @ApiProperty({ example: '1234', description: '4 digit MPIN set by the user' })
    @IsString()
    @Matches(/^\d{4}$/, { message: 'MPIN must contain only numbers' })
    newMpin: string;
}