// // import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsDateString } from 'class-validator';
// // import { ApiProperty } from '@nestjs/swagger';

// // export class CreateAppointmentDto {
// //   @ApiProperty({ description: 'MongoDB ID of the doctor for the appointment' })
// //   @IsMongoId()
// //   @IsNotEmpty()
// //   doctorId: string;

// //   @ApiProperty({ description: 'Date and time of the appointment (ISO string)', example: '2025-09-25T10:30:00.000Z' })
// //   @IsDateString()
// //   @IsNotEmpty()
// //   date: string;

// //   @ApiProperty({ description: 'Optional notes for the appointment', required: false })
// //   @IsOptional()
// //   @IsString()
// //   notes?: string;
// // }

// import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsDateString } from 'class-validator';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// export class CreateAppointmentDto {
//   @ApiProperty({ description: 'MongoDB ID of the doctor for the appointment' })
//   @IsMongoId()
//   @IsNotEmpty()
//   doctorId: string;

//   @ApiPropertyOptional({
//     description: 'Date and time of the appointment (ISO string). If not provided, an available slot will be auto-assigned',
//     example: '2025-09-25T10:30:00.000Z',
//   })
//   @IsOptional()
//   @IsDateString()
//   date?: string;

//   @ApiPropertyOptional({ description: 'Optional notes for the appointment' })
//   @IsOptional()
//   @IsString()
//   notes?: string;
// }



import { IsString, IsDateString, IsOptional, IsMongoId, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookAppointmentDto {
  @ApiProperty({ example: '64fa2b4c0f88d1852e6ac001', description: 'Patient member ID to book appointment for' })
  @IsMongoId()
  patientEntryId: string;

  @ApiProperty({ example: '64fa2b4c0f88d1852e6ac002', description: 'Doctor ID to book appointment with' })
  @IsMongoId()
  doctorId: string;

  @ApiProperty({ example: '2025-10-01', description: 'Appointment date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '10:00', description: 'Start time of appointment (HH:MM)' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Start time must be in HH:MM format' })
  startTime: string;

  @ApiProperty({ example: '10:30', description: 'End time of appointment (HH:MM)' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'End time must be in HH:MM format' })
  endTime: string;

  @ApiProperty({ example: 'Regular checkup', description: 'Reason for appointment', required: false })
  @IsOptional()
  @MinLength(3)
  @MaxLength(200)
  reason?: string;
}
