import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDoctorDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '1980-07-15', description: 'Date of birth' })
  @IsDateString()
  dob: string;

  @ApiProperty({ example: 'male', description: 'Gender' })
  @IsString()
  gender: string;

  @ApiProperty({ example: 'Cardiologist', description: 'Specialization' })
  @IsString()
  specialization: string;

  @ApiProperty({ example: 'DOC12345', description: 'Medical license number' })
  @IsString()
  licenseNumber: string;
}
