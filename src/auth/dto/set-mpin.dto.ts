import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetMPINDto {
    @ApiProperty({ example: '1234', description: '4 digit MPIN set by the user' })
    @IsString()
    @Matches(/^\d{4}$/, { message: 'MPIN must contain only numbers' })
    createMpin: string;

    @ApiProperty({ example: '1234', description: 'Confirm MPIN' })
    @IsString()
    @Matches(/^\d{4}$/, { message: 'Confirm MPIN must contain only numbers' })
    confirmMpin: string;
}
