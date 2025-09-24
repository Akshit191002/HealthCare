import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'MongoDB ID of the doctor for the appointment' })
  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Date and time of the appointment (ISO string)', example: '2025-09-25T10:30:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Optional notes for the appointment', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
