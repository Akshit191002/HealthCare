import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFamilyMemberDto1 {
  @ApiProperty({ description: 'Main customer ID of the subscription', example: 'CUST123' })
  @IsString()
  mainCustomerId: string;

  @ApiProperty({ description: 'Card ID for immediate payment', example: 'CARD123' })
  @IsString()
  mainCardId: string;

  @ApiProperty({ description: 'Existing subscription ID', example: 'SUB123' })
  @IsString()
  subscriptionId: string;

  @ApiProperty({ description: 'Price of the new member in USD', example: 200 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  newMemberAmount: number;

  @ApiProperty({ description: 'Date when new member is added', example: '2025-06-01T00:00:00.000Z' })
  @IsDateString()
  joinDate: string;
}


export class RemoveMemberDto {
    @ApiProperty({ description: 'Main customer ID', example: 'GHXAWZ5EW83V1BJ12BPJZ2YJWC' })
    @IsString()
    mainCustomerId!: string;

    @ApiProperty({ description: 'Subscription ID', example: 'efb3de09-a641-48af-80ae-62a315f7f5a0' })
    @IsString()
    subscriptionId!: string;

    @ApiProperty({ description: 'Amount of the member being removed (optional)', example: 100 })
    @IsOptional()
    @IsNumber()
    removedMemberAmount?: number;
}