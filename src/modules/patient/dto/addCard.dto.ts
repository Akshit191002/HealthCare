import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCardAndSubscribeDto {
  @ApiProperty({ example: 'cnon:card-nonce-from-frontend', description: 'Square card nonce from frontend' })
  @IsString({ message: 'cardNonce must be a string' })
  cardNonce: string;

  @ApiProperty({ example: 'PJZBLNAII3D4GPDA4L2RNTON', description: 'Square plan variation ID' })
  @IsString({ message: 'planVariationId must be a string' })
  planVariationId: string;
}
