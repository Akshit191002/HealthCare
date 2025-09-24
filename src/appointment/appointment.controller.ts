import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppointmentsService } from './appointment.service';
import { CreateAppointmentDto } from './dto/createAppointment.dto';
import { RolesGuard } from 'src/utils/roles.guard';
import { Roles } from 'src/utils/roles.decorator';

@ApiTags('Appointments')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Roles('patient')
    @Post()
    @ApiOperation({ summary: 'Create a new appointment' })
    @ApiResponse({ status: 201, description: 'Appointment successfully created' })
    @ApiResponse({ status: 400, description: 'Validation or Bad Request' })
    async create(@Body() dto: CreateAppointmentDto, @Req() req) {
        return this.appointmentsService.createAppointment(dto, req.user.userId);
    }

}
