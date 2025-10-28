// import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
// import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
// import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { AppointmentsService } from './appointment.service';
// import { CreateAppointmentDto } from './dto/createAppointment.dto';
// import { RolesGuard } from 'src/utils/roles.guard';
// import { Roles } from 'src/utils/roles.decorator';

// @ApiTags('Appointments')
// @ApiBearerAuth('bearerAuth')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('appointments')
// export class AppointmentsController {
//     constructor(private readonly appointmentsService: AppointmentsService) { }

//     @Roles('patient')
//     @Post()
//     @ApiOperation({ summary: 'Create a new appointment' })
//     @ApiResponse({ status: 201, description: 'Appointment successfully created' })
//     @ApiResponse({ status: 400, description: 'Validation or Bad Request' })
//     async create(@Body() dto: CreateAppointmentDto, @Req() req) {
//         return this.appointmentsService.createAppointment(dto, req.user.userId);
//     }

//     @Roles('doctor')
//     @Get('docAppointment')
//     @ApiOperation({ summary: 'Get all appointments for logged-in doctor' })
//     async docAppointments(@Req() req) {
//         return this.appointmentsService.getAppointmentsForDoctor(req.user.userId);
//     }

//     @Roles('patient')
//     @Get('patAppointment')
//     @ApiOperation({ summary: 'Get all appointments for logged-in patient' })
//     async patAppointments(@Req() req) {
//         return this.appointmentsService.getAppointmentsForPatient(req.user.userId);
//     }

// }

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/jwt/jwt-auth.guard';
import { Roles } from 'src/common/role/roles.decorator';
import { BookAppointmentDto } from './dto/createAppointment.dto';
import { RespondAppointmentDto } from './dto/respondAppointment.dto';
import { RolesGuard } from 'src/common/role/roles.guard';


@ApiTags('Appointments')
@Controller('appointments')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Roles('patient')
  @Post('book')
  @ApiOperation({ summary: 'Book an appointment' })
  @ApiResponse({ status: 201, description: 'Appointment booked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / doctor busy / daily limit reached' })
  async bookAppointment(
    @Req() req,
    @Body() dto: BookAppointmentDto
  ) {
    const userId = req.user.userId; // fetched from JWT token
    return this.appointmentService.bookAppointment(
      userId,
      dto.patientEntryId,
      dto.doctorId,
      dto.date,
      dto.startTime,
      dto.endTime,
      dto.reason,
    );
  }

  @Roles('doctor')
  @Patch('respond/:id')
  @ApiOperation({ summary: 'Doctor respond to appointment' })
  @ApiResponse({ status: 200, description: 'Appointment status updated' })
  async respondAppointment(
    @Param('id') appointmentId: string,
    @Body() body: RespondAppointmentDto,
  ) {
    // Map AppointmentStatus to string literal
    let action: 'ACCEPT' | 'REJECT' | 'RESCHEDULE';
    switch (body.action) {
      case 'ACCEPTED':
        action = 'ACCEPT';
        break;
      case 'REJECTED':
        action = 'REJECT';
        break;
      case 'RESCHEDULED':
        action = 'RESCHEDULE';
        break;
      default:
        throw new BadRequestException('Invalid action');
    }
    return this.appointmentService.respondAppointment(
      appointmentId,
      action,
      body.newDate,
      body.newStartTime,
      body.newEndTime,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get appointments for logged-in user' })
  async getAppointments(@Req() req) {
    const userId = req.user.userId;
    const role = req.user.role;
    if (role !== 'doctor' && role !== 'patient') throw new BadRequestException('Invalid role');
    return this.appointmentService.getAppointments(userId, role);
  }
}
