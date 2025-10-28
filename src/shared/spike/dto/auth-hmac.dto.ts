import { ApiProperty } from '@nestjs/swagger';

export class AuthHmacDto {
  @ApiProperty({ example: 'app_123' })
  application_id: string;

  @ApiProperty({ example: 'user_123' })
  application_user_id: string;

  @ApiProperty()
  secretKey: string;
}
