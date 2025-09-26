import { Controller, Post, Body, Get, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/utils/jwt-auth.guard';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DoctorsService } from './doctor.service';
import { RolesGuard } from 'src/utils/roles.guard';
import { Roles } from 'src/utils/roles.decorator';
import { AppointmentsService } from 'src/appointment/appointment.service';


@ApiTags('Doctors')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorsController {
    constructor(
        private readonly doctorsService: DoctorsService,
        private readonly appointmentsService: AppointmentsService
    ) { }

    @Roles('doctor')
    @Post()
    @ApiOperation({ summary: 'Register a new doctor' })
    @ApiResponse({ status: 201, description: 'Doctor registered successfully.' })
    @ApiResponse({ status: 400, description: 'Validation or bad request error.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async register(@Body() dto: RegisterDoctorDto, @Req() req) {
        try {
            return await this.doctorsService.registerDoctor(dto, req.user.userId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Roles('doctor')
    @Get('me')
    @ApiOperation({ summary: 'Get my doctor profile' })
    @ApiResponse({ status: 200, description: 'Doctor profile retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Doctor profile not found.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async getMine(@Req() req) {
        try {
            return await this.doctorsService.getMyDoctor(req.user.userId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Roles('doctor')
    @Get()
    @ApiOperation({ summary: 'Get all doctors' })
    @ApiResponse({ status: 200, description: 'Doctors list retrieved successfully.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async getAll() {
        try {
            return await this.doctorsService.getAllDoctors();
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Roles('doctor')
    @Get(':id')
    @ApiOperation({ summary: 'Get doctor by ID' })
    @ApiResponse({ status: 200, description: 'Doctor retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Doctor not found.' })
    @ApiResponse({ status: 500, description: 'Internal server error.' })
    async getById(@Param('id') id: string, @Req() req) {
        try {
            return await this.doctorsService.getDoctorById(id, req.user.userId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

}