import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class verifyMpinDto {
    @ApiProperty({ example: '64f8a2c...', description: 'User ID from frontend' })
    @IsString()
    @IsNotEmpty()
    userid: string;

    @ApiProperty({ example: '1234', description: '4 digit numeric MPIN' })
    @IsString()
    @MinLength(4, { message: 'MPIN must be 4 digits' })
    @MaxLength(4, { message: 'MPIN must be 4 digits' })
    @Matches(/^\d{4}$/, { message: 'MPIN must contain only numbers' })
    mpin: string;
}
