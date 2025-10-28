import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMPINDto {
    @ApiProperty({ example: '1234', description: '4 digit MPIN set by the user' })
    @IsString()
    @Matches(/^\d{4}$/, { message: 'MPIN must be exactly 4 digits' })
    newMpin: string;

    @ApiProperty({ example: '1234', description: 'Confirm MPIN' })
    @IsString()
    @Matches(/^\d{4}$/, { message: 'Confirm MPIN must be exactly 4 digits' })
    confirmMpin: string;
}
