import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPatientDto {
  @ApiProperty({ example: 'John', description: 'First name of the patient' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the patient' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '1990-05-15', description: 'Date of birth (ISO 8601 format)' })
  @IsDateString()
  dob: string;

  @ApiProperty({ example: 'male', description: 'Gender of the patient (male/female/other)' })
  @IsString()
  gender: string;
}
