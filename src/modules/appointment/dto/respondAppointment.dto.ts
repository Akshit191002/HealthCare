import { IsEnum, IsOptional, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../appointment.schema';

export class RespondAppointmentDto {
  @ApiProperty({ enum: AppointmentStatus, description: 'Action by doctor' })
  @IsEnum(AppointmentStatus)
  action: AppointmentStatus;

  @ApiProperty({ example: '2025-10-02', description: 'New appointment date if rescheduled', required: false })
  @IsOptional()
  @IsDateString()
  newDate?: string;

  @ApiProperty({ example: '11:00', description: 'New start time if rescheduled', required: false })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  newStartTime?: string;

  @ApiProperty({ example: '11:30', description: 'New end time if rescheduled', required: false })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  newEndTime?: string;
}
